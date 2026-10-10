import type { AggregateBucketData, WeatherHistoryItem } from './weather.types';

export type DustField = 'pm25' | 'pm10';

/** "Right now" for the dust card is the mean of the last 10 minutes. */
export const DUST_WINDOW_MS = 600_000;
/** 50% of the 120 readings a healthy device sends in 10 minutes (one per 5 s). */
export const MIN_POINTS_10M = 60;
/** Readings expected in 24 h at one per 5 s. */
export const EXPECTED_DAY_POINTS = 17_280;
/** Share of the day that must be covered before a 24 h mean is shown (EPA asks for 75% too). */
export const MIN_DAY_COVERAGE = 0.75;

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Mean of a dust field over the window ending at `nowMs`. The window ends at
 * "now", not at the last reading, so a device that has gone silent yields
 * `null` instead of stale numbers. Failed reads (`null`) never count as
 * readings; too few real readings also yields `null`.
 */
export function recentMean(
  history: WeatherHistoryItem[],
  field: DustField,
  nowMs: number = Date.now(),
  windowMs: number = DUST_WINDOW_MS,
  minPoints: number = MIN_POINTS_10M,
): { mean: number; count: number } | null {
  const from = nowMs - windowMs;
  let sum = 0;
  let count = 0;
  for (const item of history) {
    const value = item[field];
    if (!isNumber(value)) continue;
    const t = Date.parse(item.date);
    if (!(t >= from && t <= nowMs)) continue;
    sum += value;
    count++;
  }
  return count >= minPoints ? { mean: sum / count, count } : null;
}

/**
 * 24 h mean from the server's aggregate, weighted by how many raw readings
 * each bucket holds. Buckets without a dust value (before the sensor data
 * existed, or a backend without the field) contribute nothing. `coverage` is
 * the share of the readings a full day would hold.
 */
export function dayMeanFromAggregate(
  data: AggregateBucketData | null | undefined,
  field: DustField,
): { mean: number; coverage: number } | null {
  if (!data) return null;
  let weighted = 0;
  let count = 0;
  for (const bucket of data.items) {
    const avg = bucket[field]?.avg;
    if (!isNumber(avg) || bucket.count <= 0) continue;
    weighted += avg * bucket.count;
    count += bucket.count;
  }
  return count > 0 ? { mean: weighted / count, coverage: count / EXPECTED_DAY_POINTS } : null;
}

export function hasEnoughDayCoverage(coverage: number): boolean {
  return coverage >= MIN_DAY_COVERAGE;
}
