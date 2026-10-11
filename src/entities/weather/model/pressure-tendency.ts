import type { WeatherHistoryItem } from './weather.types';

export type TendencyKind =
  | 'steady'
  | 'rising_slow'
  | 'rising'
  | 'rising_fast'
  | 'falling_slow'
  | 'falling'
  | 'falling_fast';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
/** Each side of the comparison is a 15-minute mean, so single noisy readings do not decide the trend. */
const WINDOW_MS = 15 * MINUTE_MS;
/** Fewer readings than this is not a basis for a trend (a live device sends ~180 per window, 5-minute archive data 3). */
const MIN_READINGS = 3;

function windowMean(history: WeatherHistoryItem[], fromMs: number, toMs: number): number | null {
  let sum = 0;
  let count = 0;
  for (const item of history) {
    const t = Date.parse(item.date);
    if (!Number.isFinite(t) || t <= fromMs || t > toMs) continue;
    if (!Number.isFinite(item.press)) continue;
    sum += item.press;
    count++;
  }
  return count >= MIN_READINGS ? sum / count : null;
}

function classify(delta: number): TendencyKind {
  const size = Math.abs(delta);
  if (size < 1) return 'steady';
  const dir = delta > 0 ? 'rising' : 'falling';
  if (size < 3) return `${dir}_slow`;
  if (size < 6) return dir;
  return `${dir}_fast`;
}

/**
 * How the pressure changed over the last three hours: the 15-minute mean now
 * against the 15-minute mean ending three hours ago. Meteorologists read this
 * "tendency" rather than the absolute value. Null when either window holds too
 * few readings (a device that was off, or a fresh install).
 */
export function pressureTendency(
  history: WeatherHistoryItem[],
  nowMs: number,
): { delta: number; kind: TendencyKind } | null {
  const recent = windowMean(history, nowMs - WINDOW_MS, nowMs);
  const past = windowMean(history, nowMs - 3 * HOUR_MS - WINDOW_MS, nowMs - 3 * HOUR_MS);
  if (recent === null || past === null) return null;
  const delta = recent - past;
  return { delta, kind: classify(delta) };
}
