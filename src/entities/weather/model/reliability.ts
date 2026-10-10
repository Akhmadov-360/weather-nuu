import type { WeatherHistoryItem } from './weather.types';

export type Bucket = 'ok' | 'partial' | 'gap';

const MINUTE_MS = 60_000;
export const STRIP_MINUTES = 60;
/** A healthy device sends about 12 readings a minute (one per 5 s); half of that counts as a good minute. */
const OK_PER_MINUTE = 6;

/**
 * One bucket per minute of the last hour, oldest first, the minute containing
 * `nowMs` last. A full minute is `ok` with at least half of the readings a
 * healthy device sends, `partial` with some, `gap` with none. The minute that
 * is still running is judged by how much of it has passed, so the live edge of
 * the strip is not marked down for readings that cannot have arrived yet.
 */
export function reliabilityStrip(history: WeatherHistoryItem[], nowMs: number): { buckets: Bucket[]; covered: number } {
  const currentStart = Math.floor(nowMs / MINUTE_MS) * MINUTE_MS;
  const firstStart = currentStart - (STRIP_MINUTES - 1) * MINUTE_MS;
  const counts = new Array<number>(STRIP_MINUTES).fill(0);

  for (const item of history) {
    const t = Date.parse(item.date);
    if (!Number.isFinite(t) || t < firstStart || t > nowMs) continue;
    counts[Math.floor((t - firstStart) / MINUTE_MS)]!++;
  }

  const elapsedSeconds = (nowMs - currentStart) / 1000;
  const currentNeed = Math.floor(elapsedSeconds / 10); // half of the readings expected so far

  const buckets = counts.map((count, i): Bucket => {
    const isCurrent = i === STRIP_MINUTES - 1;
    const need = isCurrent ? currentNeed : OK_PER_MINUTE;
    if (need === 0 || count >= need) return 'ok';
    return count > 0 ? 'partial' : 'gap';
  });
  return { buckets, covered: buckets.filter((b) => b !== 'gap').length };
}
