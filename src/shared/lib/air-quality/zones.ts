import type { CategoryId, Pollutant, Standard } from './types';

export type ZoneStop = { category: CategoryId; fromPct: number; toPct: number };

/**
 * Each category's share of a bar scaled 0..`max`. A row's upper edge is its
 * `cHigh`; the gap to the next row (e.g. 9.0 -> 9.1) is closed by starting the
 * next stop where the previous one ended. Rows beginning at or beyond `max` are
 * dropped and the last kept stop is clipped to 100%.
 */
export function zoneStops(standard: Standard, pollutant: Pollutant, max: number): ZoneStop[] {
  const stops: ZoneStop[] = [];
  let from = 0;
  for (const row of standard.breakpoints[pollutant]) {
    if (row.cLow >= max) break;
    const to = Math.min((row.cHigh / max) * 100, 100);
    stops.push({ category: row.category, fromPct: from, toPct: to });
    from = to;
  }
  const last = stops[stops.length - 1];
  if (last) last.toPct = 100;
  return stops;
}

export type ChartThreshold = { value: number; category: CategoryId };

/** Boundaries between categories (the `cHigh` of every row but the last), for chart guide lines. */
export function chartThresholds(standard: Standard, pollutant: Pollutant): ChartThreshold[] {
  return standard.breakpoints[pollutant].slice(0, -1).map((row) => ({ value: row.cHigh, category: row.category }));
}
