import type { WeatherHistoryItem } from '@/entities/weather/model/weather.types';

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | '90d';

/** Ranges the canonical live-polled/WS-fed cache (≤24h) can satisfy client-side, no extra fetch needed. */
export const CLIENT_ONLY_RANGES: ReadonlySet<TimeRange> = new Set(['1h', '6h', '24h']);

/**
 * hours= value to send the backend for ranges that need a wider
 * server-side fetch. Capped at 90 days: beyond that, raw pagination stops
 * being a sensible model for chart rendering (>500k points, ~30 sequential
 * requests, ECharts under strain even with LTTB sampling). Wider ranges
 * belong on a future aggregate endpoint (bucketed avg/min/max), and the
 * export flow for raw analytics. See docs/decisions/history-analytics.md.
 */
export const RANGE_TO_HOURS: Partial<Record<TimeRange, number>> = {
  '7d':  7  * 24,
  '30d': 30 * 24,
  '90d': 90 * 24,
};

const RANGE_MS: Record<TimeRange, number> = {
  '1h':  60 * 60_000,
  '6h':  6  * 60 * 60_000,
  '24h': 24 * 60 * 60_000,
  '7d':  7  * 24 * 60 * 60_000,
  '30d': 30 * 24 * 60 * 60_000,
  '90d': 90 * 24 * 60 * 60_000,
};

/*
 * Минимальный валидный timestamp.
 * Данные до 2020 — результат бага прошивки сенсора:
 * Unix timestamp в секундах интерпретируется как миллисекунды,
 * что даёт даты вида 2001-10-05 (31 557 600 секунд ≈ 2001 год).
 */
export const MIN_VALID_TS = new Date('2020-01-01T00:00:00Z').getTime();

export function isValidTimestamp(dateStr: string): boolean {
  const ts = new Date(dateStr).getTime();
  return !Number.isNaN(ts) && ts >= MIN_VALID_TS;
}

export function filterByTimeRange(
  history: WeatherHistoryItem[],
  range: TimeRange,
): WeatherHistoryItem[] {
  // Сначала убираем записи с заведомо некорректными датами
  const valid = history.filter((item) => isValidTimestamp(item.date));
  if (!valid.length) return [];

  /*
   * Точка отсчёта — МАКСИМАЛЬНЫЙ валидный timestamp в данных,
   * а не последний элемент массива (он может быть из 2001).
   * Это позволяет "24ч" всегда показывать последние 24ч доступных данных.
   */
  let reference = 0;
  for (const item of valid) {
    const ts = new Date(item.date).getTime();
    if (ts > reference) reference = ts;
  }

  const cutoff = reference - RANGE_MS[range];
  return valid.filter((item) => new Date(item.date).getTime() >= cutoff);
}

export type CustomDateRange = { from: Date; to: Date };

/**
 * hours= to request from the backend for an arbitrary calendar range —
 * wide enough to cover from `range.from` up to now, then trimmed exactly
 * client-side. Same 90-day cap as the preset ranges: past that the chart
 * pipeline (raw pagination + ECharts) starts costing seconds and MBs of
 * memory rather than milliseconds — the calendar UI warns users when the
 * span goes over.
 */
const CUSTOM_RANGE_MAX_HOURS = 90 * 24;
export function customRangeToHours(range: CustomDateRange): number {
  const ms = Date.now() - range.from.getTime();
  return Math.min(CUSTOM_RANGE_MAX_HOURS, Math.max(1, Math.ceil(ms / 3_600_000)));
}

export function filterByExactRange(
  history: WeatherHistoryItem[],
  range: CustomDateRange,
): WeatherHistoryItem[] {
  const fromMs = range.from.getTime();
  // Inclusive of the whole `to` day if a bare date was passed (midnight).
  const toMs = range.to.getTime();
  return history.filter((item) => {
    if (!isValidTimestamp(item.date)) return false;
    const ts = new Date(item.date).getTime();
    return ts >= fromMs && ts <= toMs;
  });
}
