import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGIN = 'http://localhost:5173';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** ENV is read once at import time, so each test loads a fresh copy of the module. */
async function loadExportModule(env: Record<string, string> = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.stubGlobal('window', { location: { origin: ORIGIN } });
  return import('./weather-export');
}

describe('export URLs and file names', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('builds no URL when the export base URL is not configured', async () => {
    const mod = await loadExportModule();
    expect(mod.buildExportUrl('room', undefined, 'ru')).toBeNull();
    expect(mod.buildByMonthsExportUrl('room', ['2026-05'], 'csv', 'ru')).toBeNull();
  });

  it('builds the by-months URL with sorted months and a normalized language', async () => {
    const mod = await loadExportModule({ VITE_EXPORT_BASE_URL: '/api' });
    const url = new URL(mod.buildByMonthsExportUrl('room', ['2026-05', '2026-03', '2026-04'], 'xlsx', 'ru-RU')!);
    expect(url.origin).toBe(ORIGIN);
    expect(url.pathname).toBe('/api/v1/export/room/by-months');
    expect(url.searchParams.get('months')).toBe('2026-03,2026-04,2026-05');
    expect(url.searchParams.get('format')).toBe('xlsx');
    expect(url.searchParams.get('lang')).toBe('ru');
  });

  it('builds no by-months URL for an empty month list', async () => {
    const mod = await loadExportModule({ VITE_EXPORT_BASE_URL: '/api' });
    expect(mod.buildByMonthsExportUrl('room', [], 'csv', 'en')).toBeNull();
  });

  it('keeps absolute base URLs working', async () => {
    const mod = await loadExportModule({ VITE_EXPORT_BASE_URL: 'https://weather.nuu.uz/api' });
    const url = new URL(mod.buildExportUrl('street', undefined, 'uz')!);
    expect(url.origin).toBe('https://weather.nuu.uz');
    expect(url.searchParams.get('lang')).toBe('uz');
    expect(url.searchParams.get('format')).toBe('xlsx');
  });

  it('falls back to English for unsupported languages', async () => {
    const mod = await loadExportModule({ VITE_EXPORT_BASE_URL: '/api' });
    const url = new URL(mod.buildExportUrl('room', undefined, 'de')!);
    expect(url.searchParams.get('lang')).toBe('en');
  });

  it('adds the exact range to the URL', async () => {
    const mod = await loadExportModule({ VITE_EXPORT_BASE_URL: '/api' });
    const range = { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-10-02T00:00:00Z') };
    const url = new URL(mod.buildExportUrl('room', range, 'en')!);
    expect(url.searchParams.get('from')).toBe('2026-10-01T00:00:00.000Z');
    expect(url.searchParams.get('to')).toBe('2026-10-02T00:00:00.000Z');
  });

  it('names files like the server does', async () => {
    const mod = await loadExportModule();
    expect(mod.buildExportFilename('room')).toBe('room-export.xlsx');
    expect(
      mod.buildExportFilename('street', { from: new Date('2026-10-01T10:00:00Z'), to: new Date('2026-10-05T10:00:00Z') }),
    ).toBe('street-export-2026-10-01_2026-10-05.xlsx');
    expect(mod.buildByMonthsFilename('room', ['2026-05'], 'xlsx')).toBe('room-2026-05.xlsx');
    expect(mod.buildByMonthsFilename('room', ['2026-05', '2026-03', '2026-04'], 'csv')).toBe(
      'room-2026-03_2026-05.zip',
    );
  });
});

describe('downloadExport', () => {
  const enc = new TextEncoder();
  /** A minimal valid ZIP tail: the End Of Central Directory record. */
  const zipBytes = () => new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 0x50, 0x4b, 0x05, 0x06, ...new Array(18).fill(0)]);

  let link: { href: string; download: string; rel: string; click: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  let fetchMock: ReturnType<typeof vi.fn>;

  function streamResponse(chunks: Uint8Array[], opts: { contentType?: string; failAfterChunks?: number; status?: number } = {}) {
    const { contentType = 'text/csv', failAfterChunks, status = 200 } = opts;
    let i = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (failAfterChunks !== undefined && i >= failAfterChunks) {
          controller.error(new TypeError('network error'));
          return;
        }
        if (i < chunks.length) controller.enqueue(chunks[i++]!);
        else controller.close();
      },
    });
    return new Response(body, { status, headers: { 'content-type': contentType } });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    link = { href: '', download: '', rel: '', click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal('document', { createElement: vi.fn(() => link), body: { appendChild: vi.fn() } });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('downloads on the first try and reports progress as attempt 1', async () => {
    fetchMock.mockResolvedValueOnce(streamResponse([enc.encode('a,b\n'), enc.encode('1,2\n')]));
    const { downloadExport } = await loadExportModule();
    const onProgress = vi.fn();
    const onRetry = vi.fn();

    await downloadExport('/x', 'room.csv', onProgress, onRetry);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenLastCalledWith(8, undefined, 1);
    expect(link.download).toBe('room.csv');
    expect(link.click).toHaveBeenCalledTimes(1);
  });

  it('retries after a connection dropped mid-stream and then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(streamResponse([enc.encode('partial')], { failAfterChunks: 1 }))
      .mockResolvedValueOnce(streamResponse([enc.encode('complete file')]));
    const { downloadExport } = await loadExportModule();
    const onProgress = vi.fn();
    const onRetry = vi.fn();

    const done = downloadExport('/x', 'room.csv', onProgress, onRetry);
    await vi.advanceTimersByTimeAsync(1000);
    await done;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, 3);
    // Byte counting restarts from zero on the second attempt, and says so.
    expect(onProgress).toHaveBeenCalledWith(7, undefined, 1);
    expect(onProgress).toHaveBeenLastCalledWith(13, undefined, 2);
    expect(link.click).toHaveBeenCalledTimes(1);
  });

  it('waits 1 s before the second attempt and 2 s before the third', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(streamResponse([enc.encode('ok')]));
    const { downloadExport } = await loadExportModule();

    const done = downloadExport('/x', 'room.csv', vi.fn());
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await done;
    expect(link.click).toHaveBeenCalledTimes(1);
  });

  it('gives up after three attempts and rejects with the last error', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(streamResponse([], { status: 500 })));
    const { downloadExport } = await loadExportModule();
    const onRetry = vi.fn();

    const done = downloadExport('/x', 'room.csv', vi.fn(), onRetry);
    const assertion = expect(done).rejects.toThrow('Export request failed (500)');
    await vi.advanceTimersByTimeAsync(3000);
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(link.click).not.toHaveBeenCalled();
  });

  it('treats an XLSX body without a ZIP trailer as truncated and retries', async () => {
    fetchMock
      .mockResolvedValueOnce(streamResponse([enc.encode('PK-but-cut-off-halfway')], { contentType: XLSX }))
      .mockResolvedValueOnce(streamResponse([zipBytes()], { contentType: XLSX }));
    const { downloadExport } = await loadExportModule();

    const done = downloadExport('/x', 'room.xlsx', vi.fn());
    await vi.advanceTimersByTimeAsync(1000);
    await done;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(link.click).toHaveBeenCalledTimes(1);
  });

  it('accepts an XLSX body that ends with the ZIP trailer on the first try', async () => {
    fetchMock.mockResolvedValueOnce(streamResponse([zipBytes()], { contentType: XLSX }));
    const { downloadExport } = await loadExportModule();

    await downloadExport('/x', 'room.xlsx', vi.fn());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(link.click).toHaveBeenCalledTimes(1);
  });

  it('accepts a ZIP trailer split across two chunks', async () => {
    const bytes = zipBytes();
    fetchMock.mockResolvedValueOnce(streamResponse([bytes.slice(0, 9), bytes.slice(9)], { contentType: 'application/zip' }));
    const { downloadExport } = await loadExportModule();

    await downloadExport('/x', 'room.zip', vi.fn());

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
