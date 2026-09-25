import type { WeatherHistoryItem } from './weather.types';

export type FreshnessState = 'live' | 'stale' | 'offline';

/**
 * How long the tail run of bit-identical readings has to SPAN (not how
 * many points it contains) before we call the feed "stuck". Time-based
 * rather than count-based on purpose: a real device now posts every ~5s,
 * and DHT22/BMP280-class sensors have coarse enough resolution that all
 * 5 fields coincidentally repeat for a handful of consecutive samples
 * fairly often just from quantization — empirically, up to ~35s runs
 * happen several times an hour on a live, perfectly healthy sensor. A
 * fixed point-count window (the previous "3 points in a row" rule) fires
 * on that natural noise. 10 minutes comfortably clears the observed
 * noise floor (>15x margin) while still catching a genuinely stuck feed
 * well before the harder 3h OFFLINE_AGE_MS cutoff below.
 */
const MIN_STUCK_DURATION_MS = 10 * 60_000;

/** Beyond this age, nothing (real or cloned) can still be arriving — matches
 *  the backend's own hourly-snapshot cap (apps/api/src/jobs/hourly-snapshot.ts). */
const OFFLINE_AGE_MS = 3 * 60 * 60 * 1000;

const FIELDS: (keyof WeatherHistoryItem)[] = ['temp', 'hum', 'press', 'mq5', 'mq3'];

function sensorValuesEqual(a: WeatherHistoryItem, b: WeatherHistoryItem): boolean {
  return FIELDS.every((field) => a[field] === b[field]);
}

/**
 * Purely data-driven — works against any backend, old or new, without
 * needing a dedicated "is this a real reading" flag from the API.
 *
 * Age alone isn't enough: a backend can keep a timestamp looking "fresh"
 * by cloning the last known value on a schedule (exactly what the old
 * backend does, and what apps/api did until its 3h cap). Value repetition
 * catches that — a real sensor's readings drift with environmental noise;
 * a run of bit-identical points *spanning long enough* is the signature
 * of a clone loop or a truly stuck sensor, not ordinary quantization
 * noise, however recent the latest timestamp looks.
 */
export function computeFreshness(history: WeatherHistoryItem[], now: number = Date.now()): FreshnessState {
  if (history.length === 0) return 'offline';

  const latest = history[history.length - 1]!;
  const ageMs = now - new Date(latest.date).getTime();
  if (Number.isNaN(ageMs) || ageMs > OFFLINE_AGE_MS) return 'offline';

  // Walk backward from the latest point while every field keeps matching
  // it, then check how much wall-clock time that identical run spans.
  let i = history.length - 1;
  while (i > 0 && sensorValuesEqual(history[i - 1]!, latest)) i--;
  const runStartMs = new Date(history[i]!.date).getTime();
  const latestMs = new Date(latest.date).getTime();
  const stuckSpanMs = latestMs - runStartMs;

  if (!Number.isNaN(stuckSpanMs) && stuckSpanMs >= MIN_STUCK_DURATION_MS) return 'stale';

  return 'live';
}
