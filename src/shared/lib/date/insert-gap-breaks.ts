export type ChartPoint = [number, number | null];
export type ChartGap = { fromTs: number; toTs: number };

/** Above this cadence between two consecutive real points, treat it as a
 *  genuine gap rather than the normal ~hourly cadence between snapshot
 *  clones during the backend's accepted grace window (see
 *  apps/api/src/jobs/hourly-snapshot.ts — 3h cap). 90min sits comfortably
 *  above a single missed hourly cycle but well under that cap, so routine
 *  snapshot spacing never gets flagged while real silence reliably does. */
export const CHART_GAP_THRESHOLD_MS = 90 * 60_000;

export function detectGaps(points: ChartPoint[], gapThresholdMs: number): ChartGap[] {
  const gaps: ChartGap[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    if (curr[0] - prev[0] > gapThresholdMs) {
      gaps.push({ fromTs: prev[0], toTs: curr[0] });
    }
  }
  return gaps;
}

/**
 * Inserts a null-valued point at the midpoint of each detected gap so
 * ECharts breaks the line there (a line series does not connect across a
 * null value by default) instead of drawing a straight interpolated line
 * across weeks or months of real silence — the same "don't fake
 * continuity" principle as the backend's export gap-detector
 * (apps/api/src/modules/export/gap-detector.ts), applied to the live
 * chart instead of a CSV export.
 */
export function insertGapBreaks(points: ChartPoint[], gaps: ChartGap[]): ChartPoint[] {
  if (gaps.length === 0) return points;

  const breakAfter = new Map(gaps.map((g) => [g.fromTs, g.toTs]));
  const result: ChartPoint[] = [];

  for (const point of points) {
    result.push(point);
    const gapEnd = breakAfter.get(point[0]);
    if (gapEnd !== undefined) {
      result.push([(point[0] + gapEnd) / 2, null]);
    }
  }

  return result;
}
