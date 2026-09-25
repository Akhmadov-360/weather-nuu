import { ENV } from '@/shared/config/env';
import type { WeatherPageType } from '@/shared/types/common';
import type { CustomDateRange } from '@/shared/lib/date/filter-by-range';

/**
 * Backend understands en/ru/uz — anything else falls back to en so the
 * XLSX headers stay readable rather than showing raw keys.
 */
function normalizeExportLang(uiLang: string): 'en' | 'ru' | 'uz' {
  if (uiLang.startsWith('ru')) return 'ru';
  if (uiLang.startsWith('uz')) return 'uz';
  return 'en';
}

/**
 * Points at apps/api's /v1/export/:source (streamed XLSX with two sheets —
 * Readings and Gaps — with localized column headers, see
 * apps/api/src/modules/export). Returns null when ENV.exportBaseUrl isn't
 * configured (old backend had no export endpoint at all).
 */
export function buildExportUrl(
  type: WeatherPageType,
  range: CustomDateRange | undefined,
  uiLang: string,
): string | null {
  if (!ENV.exportBaseUrl) return null;

  const url = new URL(`${ENV.exportBaseUrl}/v1/export/${type}`);
  url.searchParams.set('format', 'xlsx');
  url.searchParams.set('lang', normalizeExportLang(uiLang));
  if (range) {
    url.searchParams.set('from', range.from.toISOString());
    url.searchParams.set('to', range.to.toISOString());
  }
  return url.toString();
}

export function buildExportFilename(type: WeatherPageType, range?: CustomDateRange): string {
  if (!range) return `${type}-export.xlsx`;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return `${type}-export-${iso(range.from)}_${iso(range.to)}.xlsx`;
}

/**
 * URL for the calendar-months export. Multi-month picks come back as a
 * ZIP; a single month is returned as a flat CSV/XLSX (the server does
 * that decision). `months` is a sorted comma-separated list of YYYY-MM.
 */
export function buildByMonthsExportUrl(
  type: WeatherPageType,
  months: string[],
  format: 'csv' | 'xlsx',
  uiLang: string,
): string | null {
  if (!ENV.exportBaseUrl || months.length === 0) return null;
  const url = new URL(`${ENV.exportBaseUrl}/v1/export/${type}/by-months`);
  url.searchParams.set('months', months.slice().sort().join(','));
  url.searchParams.set('format', format);
  url.searchParams.set('lang', normalizeExportLang(uiLang));
  return url.toString();
}

/**
 * Multi-month → .zip (server wraps everything), single-month → the
 * chosen flat format. The naming pattern (`type-YYYY-MM` for one month,
 * `type-YYYY-MM_YYYY-MM.zip` for a span) matches what the server sends
 * in its `content-disposition`, so downloads look consistent to users
 * regardless of which entry point they used.
 */
export function buildByMonthsFilename(
  type: WeatherPageType,
  months: string[],
  format: 'csv' | 'xlsx',
): string {
  const sorted = months.slice().sort();
  if (sorted.length === 1) return `${type}-${sorted[0]}.${format}`;
  return `${type}-${sorted[0]}_${sorted[sorted.length - 1]}.zip`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ZIP's End Of Central Directory record signature (`PK\x05\x06`) — the
 * last structure written in any well-formed ZIP, and XLSX files are ZIP
 * containers. Fastify's export streams never send `Content-Length` (see
 * `looksLikeCompleteZip` below for why that matters), so for zip-shaped
 * output this is the one truncation signal we actually have: a stream
 * that got cut off mid-write won't end with this marker.
 */
const ZIP_EOCD_SIGNATURE = [0x50, 0x4b, 0x05, 0x06];

/** Scans the tail of the blob for the ZIP EOCD signature (see above). Our
 * exports carry no zip comment, so the record always lands in the last
 * ~22 bytes — 256 gives comfortable slack without reading the whole file
 * back off the Blob. */
async function looksLikeCompleteZip(blob: Blob): Promise<boolean> {
  const tail = new Uint8Array(await blob.slice(Math.max(0, blob.size - 256)).arrayBuffer());
  for (let i = tail.length - ZIP_EOCD_SIGNATURE.length; i >= 0; i--) {
    if (ZIP_EOCD_SIGNATURE.every((byte, j) => tail[i + j] === byte)) return true;
  }
  return false;
}

function isZipBasedContentType(contentType: string): boolean {
  return contentType.includes('zip') || contentType.includes('spreadsheetml');
}

/**
 * A single fetch-and-drain attempt. Throws whenever the response can't be
 * trusted as complete — a non-2xx status, a reader error mid-stream (the
 * browser surfaces a dropped chunked connection as a rejected `read()`,
 * e.g. `ERR_INCOMPLETE_CHUNKED_ENCODING`), or — for XLSX/ZIP output — a
 * stream that ends without a valid ZIP trailer. All three are what
 * `downloadExport` below treats as retryable.
 *
 * There's deliberately no `content-length`-based truncation check here:
 * apps/api's export routes stream via `reply.send(stream)` without a known
 * final size, so every response actually arrives as
 * `Transfer-Encoding: chunked` with no `content-length` header at all
 * (verified against production) — a check comparing bytes read against
 * that header would never fire and would just be dead code. The ZIP-magic
 * check above is what actually catches a silent, error-free truncation for
 * XLSX/ZIP; CSV has no equivalent trailer to check, so a truncated CSV
 * that ends without a read() error can only be caught by the caller
 * noticing the data looks wrong.
 */
async function fetchExportOnce(
  url: string,
  onProgress?: (loaded: number, total: number | undefined, attempt: number) => void,
  attempt = 1,
): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Export request failed (${res.status})`);
  }
  const totalHeader = res.headers.get('content-length');
  const total = totalHeader ? Number(totalHeader) : undefined;
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  if (res.body && onProgress) {
    const reader = res.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        onProgress(loaded, total, attempt);
      }
    } finally {
      // Always release the lock — on a mid-stream read() rejection just as
      // much as on a clean finish — so a failed attempt doesn't leave its
      // stream locked while the retry loop opens a brand new fetch.
      reader.releaseLock();
    }
  } else {
    // Fallback for callers that don't care about progress or environments
    // without a streaming body — just take the whole thing at once.
    chunks.push(new Uint8Array(await res.arrayBuffer()));
    loaded = chunks[0]!.byteLength;
    onProgress?.(loaded, total, attempt);
  }

  const blob = new Blob(chunks as BlobPart[], { type: contentType });

  if (isZipBasedContentType(contentType) && !(await looksLikeCompleteZip(blob))) {
    throw new Error(`Export stream ended early (got ${loaded} bytes, missing ZIP trailer)`);
  }

  return blob;
}

const EXPORT_MAX_ATTEMPTS = 3;
const EXPORT_RETRY_DELAYS_MS = [1000, 2000];

/**
 * Fetches the export before saving it, rather than a plain `<a>` click —
 * a plain navigation gives no way to know whether it actually succeeded
 * (network error, 4xx/5xx all look identical: "nothing visibly happened").
 *
 * Reads the response body as a stream so `onProgress` can report bytes
 * downloaded while it's happening, along with which attempt (1-based) is
 * currently running — a retry always restarts the byte count from 0, and
 * without knowing it's attempt 2 a caller's UI can only show the counter
 * silently dropping back to ~0, which reads as corruption rather than a
 * fresh try.
 *
 * The full body still buffers into memory here at the end so the file
 * gets saved as one Blob — an acceptable trade at the sizes this export
 * realistically produces (megabytes, not multi-GB).
 *
 * Retries automatically on a dropped/truncated stream: Fastify commits the
 * HTTP 200 and headers before the async export generator can hit a
 * mid-stream error, so a flaky connection surfaces to the browser as an
 * aborted chunked response rather than a clean error status — the kind of
 * thing a manual re-click already "fixes" today. `onRetry` lets the caller
 * reflect the retry in its own UI (e.g. update a loading toast) without
 * this module knowing anything about toasts.
 *
 * Every retry re-fetches and re-buffers the whole file from byte 0 — the
 * export is generated on the fly rather than served from a static file, so
 * there's no byte range the server could resume from without a much larger
 * backend change (computing a row offset to resume the generator at). For
 * the multi-megabyte sizes this export produces, re-running the whole
 * request 1-2 extra times on a flaky connection is an accepted trade
 * against that complexity, not an oversight.
 */
export async function downloadExport(
  url: string,
  filename: string,
  onProgress?: (loaded: number, total: number | undefined, attempt: number) => void,
  onRetry?: (attempt: number, maxAttempts: number) => void,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= EXPORT_MAX_ATTEMPTS; attempt++) {
    try {
      const blob = await fetchExportOnce(url, onProgress, attempt);
      triggerBlobDownload(blob, filename);
      return;
    } catch (err) {
      lastError = err;
      if (attempt === EXPORT_MAX_ATTEMPTS) break;
      onRetry?.(attempt, EXPORT_MAX_ATTEMPTS);
      await sleep(EXPORT_RETRY_DELAYS_MS[attempt - 1] ?? 2000);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Export download failed');
}
