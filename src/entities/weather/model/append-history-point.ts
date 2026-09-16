import type { WeatherHistoryItem } from './weather.types';

/**
 * Bounds how large the live-appended history cache can grow. Without a
 * cap, a long session (WS pushing every few seconds, or just the poll
 * fallback) grows `history` forever — unbounded memory, and every single
 * append re-triggers a full O(n) remap in SensorCharts' `seriesData` memo
 * and a scan in MetricCard's min/max. 3000 points comfortably covers the
 * 1h/6h/24h ranges this cache actually serves (see filter-by-range.ts) —
 * wider ranges go through a separate one-off server fetch instead, so
 * this cap never needs to hold more than that.
 */
const MAX_LIVE_HISTORY_POINTS = 3000;

export function appendHistoryPoint(
  prev: WeatherHistoryItem[] | undefined,
  next: WeatherHistoryItem,
): WeatherHistoryItem[] | undefined {
  if (!prev) return prev;
  const last = prev.at(-1);
  if (last && last.date === next.date) return prev;

  const appended = [...prev, next];
  return appended.length > MAX_LIVE_HISTORY_POINTS
    ? appended.slice(appended.length - MAX_LIVE_HISTORY_POINTS)
    : appended;
}
