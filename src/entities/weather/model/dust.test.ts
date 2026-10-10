import { describe, expect, it } from 'vitest';
import {
  DUST_WINDOW_MS,
  EXPECTED_DAY_POINTS,
  MIN_DAY_COVERAGE,
  MIN_POINTS_10M,
  dayMeanFromAggregate,
  hasEnoughDayCoverage,
  recentMean,
} from './dust';
import type { AggregateBucketData, AggregateBucketRow, MetricStats, WeatherHistoryItem } from './weather.types';

const NOW = Date.parse('2026-10-10T12:00:00Z');
const STEP = 5_000;

/** `count` readings 5 s apart; the last one lands `endAgoMs` before NOW. */
function history(
  count: number,
  value: number | null | ((i: number) => number | null),
  endAgoMs = 0,
  field: 'pm25' | 'pm10' = 'pm25',
): WeatherHistoryItem[] {
  return Array.from({ length: count }, (_, i) => {
    const v = typeof value === 'function' ? value(i) : value;
    return {
      temp: 24, hum: 38, press: 962, mq5: 30, mq3: 3, pm25: null, pm10: null,
      [field]: v,
      date: new Date(NOW - endAgoMs - (count - 1 - i) * STEP).toISOString(),
    };
  });
}

describe('recentMean', () => {
  it('averages a full 10-minute window', () => {
    expect(recentMean(history(120, 40), 'pm25', NOW)).toEqual({ mean: 40, count: 120 });
  });

  it('exposes the agreed constants', () => {
    expect(DUST_WINDOW_MS).toBe(600_000);
    expect(MIN_POINTS_10M).toBe(60);
  });

  it('needs at least 60 points: 59 → null, 60 → a mean', () => {
    expect(recentMean(history(59, 40), 'pm25', NOW)).toBeNull();
    expect(recentMean(history(60, 40), 'pm25', NOW)).toEqual({ mean: 40, count: 60 });
  });

  it('counts only real readings: failed reads (null) do not fill the window', () => {
    const everySecondNull = history(120, (i) => (i % 2 === 0 ? 40 : null));
    expect(recentMean(everySecondNull, 'pm25', NOW)).toEqual({ mean: 40, count: 60 });

    const oneMoreNull = history(120, (i) => (i % 2 === 0 && i !== 0 ? 40 : null));
    expect(recentMean(oneMoreNull, 'pm25', NOW)).toBeNull();
  });

  it('returns null for a silent device even though older points exist', () => {
    expect(recentMean(history(200, 40, 20 * 60_000), 'pm25', NOW)).toBeNull();
  });

  it('ignores points older than the window', () => {
    const old = history(30, 1000, 11 * 60_000);
    const fresh = history(60, 40);
    expect(recentMean([...old, ...fresh], 'pm25', NOW)).toEqual({ mean: 40, count: 60 });
  });

  it('works for pm10 and does not mix the two fields', () => {
    const items = history(80, 55, 0, 'pm10');
    expect(recentMean(items, 'pm10', NOW)).toEqual({ mean: 55, count: 80 });
    expect(recentMean(items, 'pm25', NOW)).toBeNull();
  });

  it('returns null for an empty history', () => {
    expect(recentMean([], 'pm25', NOW)).toBeNull();
  });
});

const nothing: MetricStats = { avg: null, min: null, max: null };

function bucket(count: number, pm25Avg: number | null, pm10Avg: number | null = null): AggregateBucketRow {
  return {
    ts: '2026-10-10T00:00:00.000Z', count,
    temp: nothing, hum: nothing, press: nothing, mq5: nothing, mq3: nothing,
    pm25: { avg: pm25Avg, min: pm25Avg, max: pm25Avg },
    pm10: { avg: pm10Avg, min: pm10Avg, max: pm10Avg },
  };
}

function aggregate(items: AggregateBucketRow[]): AggregateBucketData {
  return { source: 'room', bucket: '1h', from: '2026-10-09T12:00:00.000Z', to: '2026-10-10T12:00:00.000Z', items };
}

describe('dayMeanFromAggregate', () => {
  it('weights bucket averages by their counts and reports coverage', () => {
    const result = dayMeanFromAggregate(aggregate([bucket(8640, 10), bucket(4320, 40)]), 'pm25');
    expect(result).toEqual({ mean: 20, coverage: 12960 / EXPECTED_DAY_POINTS });
    expect(result!.coverage).toBe(0.75);
  });

  it('skips buckets without a dust value (before the sensor data existed)', () => {
    const result = dayMeanFromAggregate(aggregate([bucket(1000, null), bucket(8640, 10)]), 'pm25');
    expect(result).toEqual({ mean: 10, coverage: 8640 / EXPECTED_DAY_POINTS });
  });

  it('reads the pm10 stats for pm10', () => {
    const result = dayMeanFromAggregate(aggregate([bucket(100, 5, 30)]), 'pm10');
    expect(result!.mean).toBe(30);
  });

  it('returns null when there is nothing to average', () => {
    expect(dayMeanFromAggregate(null, 'pm25')).toBeNull();
    expect(dayMeanFromAggregate(undefined, 'pm25')).toBeNull();
    expect(dayMeanFromAggregate(aggregate([]), 'pm25')).toBeNull();
    expect(dayMeanFromAggregate(aggregate([bucket(500, null)]), 'pm25')).toBeNull();
  });

  it('returns null for a backend that predates the dust fields (no pm25 in the items)', () => {
    const old: AggregateBucketRow = {
      ts: '2026-10-10T00:00:00.000Z', count: 500,
      temp: nothing, hum: nothing, press: nothing, mq5: nothing, mq3: nothing,
    };
    expect(dayMeanFromAggregate(aggregate([old]), 'pm25')).toBeNull();
  });
});

describe('hasEnoughDayCoverage', () => {
  it('requires 75% of the day', () => {
    expect(MIN_DAY_COVERAGE).toBe(0.75);
    expect(hasEnoughDayCoverage(0.75)).toBe(true);
    expect(hasEnoughDayCoverage(0.7499)).toBe(false);
    expect(hasEnoughDayCoverage(1)).toBe(true);
  });
});
