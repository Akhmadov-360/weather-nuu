import { computeFreshness } from './weather-freshness';
import type { WeatherHistoryItem } from './weather.types';

/**
 * live: a reading arrived within the last minute.
 * delayed: the feed is late (a sensor skips a beat now and then), shown as an age mark only.
 * archive: nothing new for 10 minutes, or the values are stuck, or the data is hours old; the cards show the
 * last known state, muted.
 */
export type ConnectionLevel = 'live' | 'delayed' | 'archive';

export type ConnectionState = {
  level: ConnectionLevel;
  /** Age of the last reading; null when there is none. */
  ageMs: number | null;
  lastSeenMs: number | null;
  /** False while the browser is offline or the API stopped answering: a different problem from a silent station. */
  linkOk: boolean;
};

export const DELAYED_AFTER_MS = 60_000;
export const ARCHIVE_AFTER_MS = 10 * 60_000;

export const LIVE_CONNECTION: ConnectionState = { level: 'live', ageMs: 0, lastSeenMs: null, linkOk: true };

export function computeConnection(history: WeatherHistoryItem[], now: number, linkOk: boolean): ConnectionState {
  const last = history[history.length - 1];
  const lastSeenMs = last ? Date.parse(last.date) : NaN;
  if (!last || !Number.isFinite(lastSeenMs)) return { level: 'archive', ageMs: null, lastSeenMs: null, linkOk };

  const ageMs = Math.max(0, now - lastSeenMs);
  let level: ConnectionLevel = 'live';
  if (computeFreshness(history, now) !== 'live' || ageMs >= ARCHIVE_AFTER_MS) level = 'archive';
  else if (ageMs >= DELAYED_AFTER_MS) level = 'delayed';
  return { level, ageMs, lastSeenMs, linkOk };
}

export type AgeUnit = 'min' | 'hour' | 'day';

/** An age as a whole number of the largest sensible unit: minutes up to an hour, hours up to two days, then days. */
export function splitAge(ageMs: number): { unit: AgeUnit; n: number } {
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 60) return { unit: 'min', n: Math.max(1, minutes) };
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return { unit: 'hour', n: hours };
  return { unit: 'day', n: Math.floor(hours / 24) };
}
