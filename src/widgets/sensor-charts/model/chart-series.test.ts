import { describe, expect, it } from 'vitest';
import type { AggregateBucketRow, MetricStats, WeatherHistoryItem } from '@/entities/weather/model/weather.types';
import {
  aggregateSeries,
  formatTooltipTs,
  makeAxisFormatter,
  rawSeries,
  summarize,
  thresholdValues,
} from './chart-series';

const local = (d: number, h: number, m = 0, mo = 9) => new Date(2026, mo, d, h, m).getTime();

describe('thresholdValues', () => {
  it('uses the zone boundaries of scale sensors', () => {
    expect(thresholdValues('hum')).toEqual([30, 60]);
    expect(thresholdValues('mq5')).toEqual([1000, 2000]);
  });

  it('uses the standard category boundaries for dust', () => {
    expect(thresholdValues('pm25')).toEqual([9, 35.4, 55.4, 125.4, 225.4]);
    expect(thresholdValues('pm10')).toEqual([54, 154, 254, 354, 424]);
  });
});

describe('makeAxisFormatter', () => {
  it('shows only the time inside one day', () => {
    const f = makeAxisFormatter(local(10, 8), local(10, 20));
    expect(f(local(10, 9, 5))).toBe('09:05');
  });

  it('adds the date when the window crosses midnight, even if shorter than 24 h', () => {
    const f = makeAxisFormatter(local(9, 17), local(10, 10));
    expect(f(local(10, 1, 30))).toBe('10.10\n01:30');
  });

  it('shows only the date for windows longer than 7 days', () => {
    const f = makeAxisFormatter(local(1, 0), local(20, 0));
    expect(f(local(5, 12))).toBe('05.10');
  });
});

describe('formatTooltipTs', () => {
  it('is a non-empty date-time string', () => {
    expect(formatTooltipTs(local(10, 9, 5))).toMatch(/\d/);
  });
});

describe('summarize', () => {
  it('returns nulls and a stable trend for no values', () => {
    expect(summarize([])).toEqual({ min: null, max: null, avg: null, current: null, trend: 'stable' });
  });

  it('computes min, max, average, the last value and the trend from the last two points', () => {
    expect(summarize([2, 4, 3])).toEqual({ min: 2, max: 4, avg: 3, current: 3, trend: 'down' });
    expect(summarize([1, 5])).toMatchObject({ current: 5, trend: 'up' });
    expect(summarize([5, 5])).toMatchObject({ trend: 'stable' });
    expect(summarize([7])).toMatchObject({ current: 7, trend: 'stable' });
  });
});

const stats = (avg: number, min: number, max: number): MetricStats => ({ avg, min, max });
const none: MetricStats = { avg: null, min: null, max: null };

function bucket(ts: string, count: number, hum: MetricStats, pm25?: MetricStats): AggregateBucketRow {
  return { ts, count, temp: none, hum, press: none, mq5: none, mq3: none, ...(pm25 ? { pm25 } : {}) };
}

describe('aggregateSeries', () => {
  const rows = [
    bucket('2026-10-10T10:00:00Z', 10, stats(40, 38, 43)),
    bucket('2026-10-10T11:00:00Z', 0, stats(0, 0, 0)),
    bucket('2026-10-10T12:00:00Z', 5, stats(50, 45, 52)),
  ];

  it('drops empty buckets and builds avg, min and the (max - min) band', () => {
    const s = aggregateSeries(rows, 'hum');
    expect(s.rows).toHaveLength(2);
    expect(s.avg.map(([, v]) => v)).toEqual([40, 50]);
    expect(s.min.map(([, v]) => v)).toEqual([38, 45]);
    expect(s.range.map(([, v]) => v)).toEqual([5, 7]);
    expect(s.avg[0]![0]).toBe(Date.parse('2026-10-10T10:00:00Z'));
  });

  it('leaves a gap instead of crashing when the backend has no dust stats', () => {
    const s = aggregateSeries(rows, 'pm25');
    expect(s.avg.map(([, v]) => v)).toEqual([null, null]);
    expect(s.range.map(([, v]) => v)).toEqual([null, null]);
  });
});

function item(date: string, pm25: number | null): WeatherHistoryItem {
  return { temp: 24, hum: 38, press: 962, mq5: 30, mq3: 3, pm25, pm10: null, date };
}

describe('rawSeries', () => {
  it('skips corrupt timestamps and keeps null readings as gaps', () => {
    const history = [
      item('2026-10-10T10:00:00Z', 12),
      item('1970-01-20T00:00:00Z', 99),
      item('2026-10-10T10:00:05Z', null),
    ];
    expect(rawSeries(history, 'pm25')).toEqual([
      [Date.parse('2026-10-10T10:00:00Z'), 12],
      [Date.parse('2026-10-10T10:00:05Z'), null],
    ]);
  });
});
