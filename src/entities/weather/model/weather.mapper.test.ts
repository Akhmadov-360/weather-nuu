import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mapWeatherHistory, mapWeatherLatest } from './weather.mapper';

const EPOCH = '1970-01-01T00:00:00.000Z';

describe('mapWeatherLatest', () => {
  it('maps the new backend payload (camelCase, ISO date)', () => {
    const result = mapWeatherLatest({
      id: 1,
      source: 'room',
      fusedTemp: 24.5,
      hum: 38.2,
      bmpPress: 962.1,
      mq5: 30,
      mq3: 3,
      recordedAt: '2026-10-10T12:00:00.000Z',
    });
    expect(result).toEqual({
      temp: 24.5,
      hum: 38.2,
      press: 962.1,
      mq5: 30,
      mq3: 3,
      date: '2026-10-10T12:00:00.000Z',
    });
  });

  it('maps the legacy backend payload (snake_case, full local date)', () => {
    const result = mapWeatherLatest({
      fused_temp: 21,
      hum: 40,
      bmp_press: 955,
      mq5: 10,
      mq3: 2,
      date: '2025-10-05 10:15:00',
    });
    expect(result.temp).toBe(21);
    expect(result.press).toBe(955);
    expect(result.date).toBe(new Date('2025-10-05T10:15:00').toISOString());
  });

  it('coerces numeric strings', () => {
    expect(mapWeatherLatest({ fusedTemp: '23.5', hum: '40' }).temp).toBe(23.5);
  });

  it('falls back to 0 and the epoch for missing fields', () => {
    expect(mapWeatherLatest({})).toEqual({ temp: 0, hum: 0, press: 0, mq5: 0, mq3: 0, date: EPOCH });
  });

  it('turns corrupted pre-2020 dates (firmware bug) into the epoch sentinel', () => {
    expect(mapWeatherLatest({ date: '2001-10-05 10:00:00' }).date).toBe(EPOCH);
  });

  it('turns unparseable dates into the epoch sentinel', () => {
    expect(mapWeatherLatest({ date: 'yesterday-ish' }).date).toBe(EPOCH);
  });
});

describe('mapWeatherLatest: short "DD-MM HH:mm" dates without a year', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 10, 12, 0, 0)); // 10 Oct 2026, local time
  });
  afterEach(() => vi.useRealTimers());

  it('reads the format as day-month, not month-day', () => {
    // "09-05" is 9 May, not 5 September.
    expect(mapWeatherLatest({ date: '09-05 11:00' }).date).toBe(new Date(2026, 4, 9, 11, 0, 0).toISOString());
  });

  it('accepts seconds', () => {
    expect(mapWeatherLatest({ date: '09-05 11:00:30' }).date).toBe(new Date(2026, 4, 9, 11, 0, 30).toISOString());
  });

  it('moves a date that would land far in the future back to the previous year', () => {
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0, 0)); // 5 Jan 2026
    expect(mapWeatherLatest({ date: '20-12 10:00' }).date).toBe(new Date(2025, 11, 20, 10, 0, 0).toISOString());
  });
});

describe('mapWeatherHistory', () => {
  const row = { fusedTemp: 24, hum: 38, bmpPress: 962, mq5: 30, mq3: 3, recordedAt: '2026-10-10T12:00:00.000Z' };

  it('accepts a bare array (old backend)', () => {
    expect(mapWeatherHistory([row, row])).toHaveLength(2);
  });

  it('accepts { data: [...] }', () => {
    expect(mapWeatherHistory({ data: [row] })).toHaveLength(1);
  });

  it('accepts { items: [...] } (new backend page)', () => {
    expect(mapWeatherHistory({ items: [row, row, row] })).toHaveLength(3);
  });

  it('accepts an empty page', () => {
    expect(mapWeatherHistory({ items: [] })).toEqual([]);
  });

  it('rejects a payload that is not a list', () => {
    expect(() => mapWeatherHistory({ nothing: true })).toThrow();
    expect(() => mapWeatherHistory('oops')).toThrow();
  });
});
