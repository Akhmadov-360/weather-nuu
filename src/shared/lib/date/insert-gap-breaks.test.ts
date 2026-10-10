import { describe, expect, it } from 'vitest';
import {
  CHART_GAP_THRESHOLD_MS,
  detectGaps,
  insertGapBreaks,
  type ChartPoint,
} from './insert-gap-breaks';

const MIN = 60_000;

describe('detectGaps', () => {
  it('finds nothing in an empty or single-point series', () => {
    expect(detectGaps([], MIN)).toEqual([]);
    expect(detectGaps([[0, 1]], MIN)).toEqual([]);
  });

  it('reports only intervals strictly longer than the threshold', () => {
    const points: ChartPoint[] = [
      [0, 1],
      [10 * MIN, 2], // exactly 10 min: not a gap for a 10 min threshold
      [30 * MIN, 3], // 20 min: gap
    ];
    expect(detectGaps(points, 10 * MIN)).toEqual([{ fromTs: 10 * MIN, toTs: 30 * MIN }]);
  });

  it('finds several gaps', () => {
    const points: ChartPoint[] = [[0, 1], [5 * MIN, 1], [60 * MIN, 1], [65 * MIN, 1], [200 * MIN, 1]];
    expect(detectGaps(points, 30 * MIN)).toHaveLength(2);
  });

  it('uses a 90 minute chart threshold, wider than the hourly snapshot cadence', () => {
    expect(CHART_GAP_THRESHOLD_MS).toBe(90 * MIN);
    // One missed hourly snapshot (2 h between points) is a gap; normal hourly spacing is not.
    expect(detectGaps([[0, 1], [60 * MIN, 1]], CHART_GAP_THRESHOLD_MS)).toEqual([]);
    expect(detectGaps([[0, 1], [120 * MIN, 1]], CHART_GAP_THRESHOLD_MS)).toHaveLength(1);
  });
});

describe('insertGapBreaks', () => {
  it('returns the very same array when there are no gaps', () => {
    const points: ChartPoint[] = [[0, 1], [1, 2]];
    expect(insertGapBreaks(points, [])).toBe(points);
  });

  it('inserts a null point in the middle of each gap so the line breaks', () => {
    const points: ChartPoint[] = [[0, 1], [10, 2], [100, 3]];
    const result = insertGapBreaks(points, [{ fromTs: 10, toTs: 100 }]);
    expect(result).toEqual([[0, 1], [10, 2], [55, null], [100, 3]]);
  });

  it('keeps the original points untouched and in order', () => {
    const points: ChartPoint[] = [[0, 1], [10, 2], [100, 3], [110, 4], [300, 5]];
    const gaps = detectGaps(points, 50);
    const result = insertGapBreaks(points, gaps);
    expect(result.filter((p) => p[1] !== null)).toEqual(points);
    expect(result.filter((p) => p[1] === null)).toHaveLength(2);
  });
});
