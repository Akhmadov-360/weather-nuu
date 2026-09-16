import type { WeatherHistoryItem } from './weather.types';

export type FreshnessState = 'live' | 'stale' | 'offline';

/** How many consecutive tail points must be bit-identical to call the feed "stuck". */
const REPEAT_WINDOW = 3;

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
 * several bit-identical points in a row is the signature of a clone loop,
 * not a live feed, however recent its timestamp looks.
 */
export function computeFreshness(history: WeatherHistoryItem[], now: number = Date.now()): FreshnessState {
  if (history.length === 0) return 'offline';

  const latest = history[history.length - 1]!;
  const ageMs = now - new Date(latest.date).getTime();
  if (Number.isNaN(ageMs) || ageMs > OFFLINE_AGE_MS) return 'offline';

  const tail = history.slice(-REPEAT_WINDOW);
  const isStuck = tail.length >= REPEAT_WINDOW && tail.every((item) => sensorValuesEqual(item, tail[0]!));
  if (isStuck) return 'stale';

  return 'live';
}
