import { describe, expect, it } from 'vitest';
import { computeFreshness } from './weather-freshness';
import type { WeatherHistoryItem } from './weather.types';

const NOW = Date.parse('2026-10-10T12:00:00Z');
const SEC = 1000;
const MIN = 60 * SEC;

function point(msAgo: number, values: Partial<WeatherHistoryItem> = {}): WeatherHistoryItem {
  return {
    temp: 24,
    hum: 38,
    press: 962,
    mq5: 30,
    mq3: 3,
    ...values,
    date: new Date(NOW - msAgo).toISOString(),
  };
}

/** Points every `stepMs` from `fromAgo` down to `toAgo`, all with identical values. */
function identicalRun(fromAgo: number, toAgo: number, stepMs: number): WeatherHistoryItem[] {
  const out: WeatherHistoryItem[] = [];
  for (let ago = fromAgo; ago >= toAgo; ago -= stepMs) out.push(point(ago));
  return out;
}

describe('computeFreshness', () => {
  it('is offline when there is no data at all', () => {
    expect(computeFreshness([], NOW)).toBe('offline');
  });

  it('is offline when the latest reading is older than 3 hours', () => {
    expect(computeFreshness([point(3 * 60 * MIN + SEC)], NOW)).toBe('offline');
  });

  it('is offline when the latest date cannot be parsed', () => {
    const broken = { ...point(0), date: 'not-a-date' };
    expect(computeFreshness([broken], NOW)).toBe('offline');
  });

  it('is live for a single fresh reading', () => {
    expect(computeFreshness([point(5 * SEC)], NOW)).toBe('live');
  });

  it('is live while values keep changing', () => {
    const history = [
      point(30 * MIN, { temp: 24.0 }),
      point(20 * MIN, { temp: 24.1 }),
      point(10 * MIN, { temp: 24.2 }),
      point(5 * SEC, { temp: 24.3 }),
    ];
    expect(computeFreshness(history, NOW)).toBe('live');
  });

  it('ignores short identical streaks caused by sensor quantization (35 s)', () => {
    const history = [
      point(10 * MIN, { temp: 23.9 }),
      ...identicalRun(35 * SEC, 0, 5 * SEC),
    ];
    expect(computeFreshness(history, NOW)).toBe('live');
  });

  it('is stale when the same values repeat for 11 minutes', () => {
    const history = [point(30 * MIN, { temp: 23.0 }), ...identicalRun(11 * MIN, 0, 5 * SEC)];
    expect(computeFreshness(history, NOW)).toBe('stale');
  });

  it('treats exactly 10 minutes of identical values as stale', () => {
    const history = [point(30 * MIN, { temp: 23.0 }), ...identicalRun(10 * MIN, 0, 5 * SEC)];
    expect(computeFreshness(history, NOW)).toBe('stale');
  });

  it('treats just under 10 minutes of identical values as live', () => {
    const history = [point(30 * MIN, { temp: 23.0 }), ...identicalRun(10 * MIN - SEC, 0, 5 * SEC)];
    expect(computeFreshness(history, NOW)).toBe('live');
  });

  it('needs ALL five fields to repeat: one changing field keeps it live', () => {
    const history: WeatherHistoryItem[] = [];
    for (let ago = 15 * MIN, i = 0; ago >= 0; ago -= 5 * SEC, i++) {
      history.push(point(ago, { mq3: i % 2 }));
    }
    expect(computeFreshness(history, NOW)).toBe('live');
  });

  it('detects a cloned flat line even though the timestamps look recent', () => {
    // Old backend behaviour: one clone per hour with the last value.
    const history = [point(3 * 60 * MIN - MIN, { temp: 22 }), point(2 * 60 * MIN, { temp: 22 }), point(60 * MIN, { temp: 22 }), point(MIN, { temp: 22 })];
    expect(computeFreshness(history, NOW)).toBe('stale');
  });
});
