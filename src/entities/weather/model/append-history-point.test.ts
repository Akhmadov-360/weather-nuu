import { describe, expect, it } from 'vitest';
import { appendHistoryPoint } from './append-history-point';
import type { WeatherHistoryItem } from './weather.types';

function point(n: number): WeatherHistoryItem {
  return {
    temp: 24,
    hum: 38,
    press: 962,
    mq5: 30,
    mq3: 3,
    pm25: null,
    pm10: null,
    date: new Date(Date.UTC(2026, 9, 10, 0, 0, 0) + n * 5000).toISOString(),
  };
}

describe('appendHistoryPoint', () => {
  it('does nothing while the history has not been loaded yet', () => {
    expect(appendHistoryPoint(undefined, point(1))).toBeUndefined();
  });

  it('appends a new point without mutating the previous array', () => {
    const prev = [point(0)];
    const next = appendHistoryPoint(prev, point(1))!;
    expect(next).toHaveLength(2);
    expect(next.at(-1)).toEqual(point(1));
    expect(prev).toHaveLength(1);
  });

  it('ignores a point whose date equals the last one (WebSocket and polling can both deliver it)', () => {
    const prev = [point(0), point(1)];
    expect(appendHistoryPoint(prev, point(1))).toBe(prev);
  });

  it('caps the list at 3000 points and drops the oldest ones', () => {
    const prev = Array.from({ length: 3000 }, (_, i) => point(i));
    const next = appendHistoryPoint(prev, point(3000))!;
    expect(next).toHaveLength(3000);
    expect(next[0]).toEqual(point(1));
    expect(next.at(-1)).toEqual(point(3000));
  });
});
