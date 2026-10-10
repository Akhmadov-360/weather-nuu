import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeatherHistoryItem } from '@/entities/weather/model/weather.types';
import {
  customRangeToHours,
  filterByExactRange,
  filterByTimeRange,
  isValidTimestamp,
} from './filter-by-range';

function item(date: string): WeatherHistoryItem {
  return { temp: 24, hum: 38, press: 962, mq5: 30, mq3: 3, pm25: null, pm10: null, date };
}

describe('isValidTimestamp', () => {
  it('accepts dates from 2020-01-01 onwards', () => {
    expect(isValidTimestamp('2020-01-01T00:00:00Z')).toBe(true);
    expect(isValidTimestamp('2026-10-10T12:00:00Z')).toBe(true);
  });

  it('rejects the firmware bug dates (seconds read as milliseconds)', () => {
    expect(isValidTimestamp('2019-12-31T23:59:59Z')).toBe(false);
    expect(isValidTimestamp('2001-10-05T10:00:00Z')).toBe(false);
    expect(isValidTimestamp('1970-01-01T00:00:00.000Z')).toBe(false);
  });

  it('rejects unparseable strings', () => {
    expect(isValidTimestamp('garbage')).toBe(false);
    expect(isValidTimestamp('')).toBe(false);
  });
});

describe('filterByTimeRange', () => {
  it('returns an empty list for empty or all-invalid input', () => {
    expect(filterByTimeRange([], '24h')).toEqual([]);
    expect(filterByTimeRange([item('2001-10-05T10:00:00Z')], '24h')).toEqual([]);
  });

  it('anchors the window on the newest VALID point, not on the last array element', () => {
    const history = [
      item('2026-10-10T10:00:00Z'),
      item('2026-10-10T09:45:00Z'),
      item('2026-10-10T07:00:00Z'), // 3h older than the newest: outside a 1h window
      item('2001-10-05T10:00:00Z'), // corrupted point sitting LAST in the array
    ];
    const result = filterByTimeRange(history, '1h');
    expect(result.map((r) => r.date)).toEqual(['2026-10-10T10:00:00Z', '2026-10-10T09:45:00Z']);
  });

  it('keeps everything inside the window and drops invalid dates', () => {
    const history = [
      item('2026-10-10T11:00:00Z'),
      item('2026-10-09T13:00:00Z'), // 22h before the newest: inside 24h
      item('2026-10-08T00:00:00Z'), // outside
      item('2001-10-05T10:00:00Z'),
    ];
    expect(filterByTimeRange(history, '24h')).toHaveLength(2);
  });

  it('includes a point exactly on the cutoff', () => {
    const history = [item('2026-10-10T12:00:00Z'), item('2026-10-10T11:00:00Z')];
    expect(filterByTimeRange(history, '1h')).toHaveLength(2);
  });
});

describe('filterByExactRange', () => {
  const range = { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-10-02T00:00:00Z') };

  it('is inclusive on both ends and excludes everything else', () => {
    const history = [
      item('2026-09-30T23:59:59Z'),
      item('2026-10-01T00:00:00Z'),
      item('2026-10-01T12:00:00Z'),
      item('2026-10-02T00:00:00Z'),
      item('2026-10-02T00:00:01Z'),
    ];
    expect(filterByExactRange(history, range).map((r) => r.date)).toEqual([
      '2026-10-01T00:00:00Z',
      '2026-10-01T12:00:00Z',
      '2026-10-02T00:00:00Z',
    ]);
  });

  it('drops invalid timestamps even when numerically inside the range', () => {
    const wide = { from: new Date(0), to: new Date('2030-01-01T00:00:00Z') };
    expect(filterByExactRange([item('2001-10-05T10:00:00Z'), item('2026-10-01T00:00:00Z')], wide)).toHaveLength(1);
  });
});

describe('customRangeToHours', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('rounds the span up to whole hours', () => {
    const from = new Date('2026-10-10T06:30:00Z'); // 5.5 h ago
    expect(customRangeToHours({ from, to: new Date() })).toBe(6);
  });

  it('never returns less than 1 hour, even for a range starting in the future', () => {
    const from = new Date('2026-10-11T00:00:00Z');
    expect(customRangeToHours({ from, to: new Date() })).toBe(1);
  });

  it('caps at 90 days', () => {
    const from = new Date('2025-01-01T00:00:00Z');
    expect(customRangeToHours({ from, to: new Date() })).toBe(90 * 24);
  });
});
