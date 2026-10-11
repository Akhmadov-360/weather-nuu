import { describe, expect, it } from 'vitest';
import { pressureTendency } from './pressure-tendency';
import type { WeatherHistoryItem } from './weather.types';

const NOW = Date.parse('2026-10-10T12:00:00Z');
const MIN = 60_000;
const HOUR = 60 * MIN;

function point(ms: number, press: number): WeatherHistoryItem {
  return { temp: 24, hum: 38, press, mq5: 30, mq3: 3, pm25: null, pm10: null, date: new Date(ms).toISOString() };
}

/** `count` readings of `press`, 5 s apart, the last one `endAgoMs` before NOW. */
function run(press: number, endAgoMs: number, count = 60): WeatherHistoryItem[] {
  return Array.from({ length: count }, (_, i) => point(NOW - endAgoMs - (count - 1 - i) * 5_000, press));
}

/** Pressure `before` three hours ago, `after` now. */
function history(before: number, after: number): WeatherHistoryItem[] {
  return [...run(before, 3 * HOUR), ...run(after, 0)];
}

describe('pressureTendency', () => {
  it.each([
    [0.4, 'steady'],
    [-0.9, 'steady'],
    [1.0, 'rising_slow'],
    [2.9, 'rising_slow'],
    [3.0, 'rising'],
    [5.9, 'rising'],
    [6.0, 'rising_fast'],
    [-1.0, 'falling_slow'],
    [-3.5, 'falling'],
    [-7, 'falling_fast'],
  ])('a change of %f hPa in 3 h is %s', (delta, kind) => {
    const t = pressureTendency(history(960, 960 + delta), NOW)!;
    expect(t.kind).toBe(kind);
    expect(t.delta).toBeCloseTo(delta, 5);
  });

  it('is null when the recent window has too few readings', () => {
    expect(pressureTendency([...run(960, 3 * HOUR), ...run(962, 0, 2)], NOW)).toBeNull();
  });

  it('is null when the window three hours ago has too few readings', () => {
    expect(pressureTendency([...run(960, 3 * HOUR, 2), ...run(962, 0)], NOW)).toBeNull();
  });

  it('is null for an empty history', () => {
    expect(pressureTendency([], NOW)).toBeNull();
  });

  it('ignores readings with unparsable dates', () => {
    const noisy = [...history(960, 964), { ...point(NOW, 1200), date: 'garbage' }];
    expect(pressureTendency(noisy, NOW)!.delta).toBeCloseTo(4, 5);
  });
});
