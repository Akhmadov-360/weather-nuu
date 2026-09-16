import { ENV } from '@/shared/config/env';
import type { WeatherPageType } from '@/shared/types/common';
import type { CustomDateRange } from '@/shared/lib/date/filter-by-range';

/**
 * Points at apps/api's /v1/export/:source (streamed CSV, gap markers
 * included — see apps/api/src/modules/export). Returns null when
 * ENV.exportBaseUrl isn't configured (old backend has no export endpoint
 * at all; this only lights up once the new backend is deployed).
 */
export function buildExportUrl(type: WeatherPageType, range?: CustomDateRange): string | null {
  if (!ENV.exportBaseUrl) return null;

  const url = new URL(`${ENV.exportBaseUrl}/v1/export/${type}`);
  url.searchParams.set('format', 'csv');
  if (range) {
    url.searchParams.set('from', range.from.toISOString());
    url.searchParams.set('to', range.to.toISOString());
  }
  return url.toString();
}

export function buildExportFilename(type: WeatherPageType, range?: CustomDateRange): string {
  if (!range) return `${type}-export.csv`;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return `${type}-export-${iso(range.from)}_${iso(range.to)}.csv`;
}

/**
 * Fetches the export before saving it, rather than a plain `<a>` click —
 * a plain navigation gives no way to know whether it actually succeeded
 * (network error, 4xx/5xx all look identical: "nothing visibly happened").
 * This does mean the full response now buffers into a Blob client-side,
 * unlike the server side of the pipeline which never holds it all in
 * memory — an acceptable trade for a real success/failure signal at the
 * sizes this export realistically produces (still a single-request CSV,
 * not a multi-GB dump).
 */
export async function downloadExport(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Export request failed (${res.status})`);
  }
  const blob = await res.blob();
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
