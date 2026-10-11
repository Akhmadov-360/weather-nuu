import { describe, expect, it } from 'vitest';
import { ARCHIVE_AFTER_MS, computeConnection, splitAge } from './connection';
import type { WeatherHistoryItem } from './weather.types';

const NOW = Date.parse('2026-10-11T12:00:00Z');

/** Readings every 5 s ending `agoMs` before NOW, drifting so the run is not "stuck". */
function feed(agoMs: number, count = 200): WeatherHistoryItem[] {
  return Array.from({ length: count }, (_, i) => ({
    temp: 24 + (i % 7) * 0.1,
    hum: 40 + (i % 5) * 0.1,
    press: 960 + (i % 3) * 0.1,
    mq5: 30 + (i % 4),
    mq3: 2 + (i % 2),
    pm25: null,
    pm10: null,
    date: new Date(NOW - agoMs - (count - 1 - i) * 5_000).toISOString(),
  }));
}

describe('computeConnection', () => {
  it('is live when the last reading is a few seconds old', () => {
    expect(computeConnection(feed(8_000), NOW, true).level).toBe('live');
  });

  it('is delayed from one minute without data', () => {
    expect(computeConnection(feed(60_000), NOW, true).level).toBe('delayed');
    expect(computeConnection(feed(59_000), NOW, true).level).toBe('live');
  });

  it('is archive after ten minutes without data', () => {
    expect(computeConnection(feed(ARCHIVE_AFTER_MS - 1_000), NOW, true).level).toBe('delayed');
    expect(computeConnection(feed(ARCHIVE_AFTER_MS), NOW, true).level).toBe('archive');
  });

  it('is archive for a feed whose values stopped changing', () => {
    const stuck = feed(0, 300).map((p) => ({ ...p, temp: 24, hum: 40, press: 960, mq5: 30, mq3: 2 }));
    expect(computeConnection(stuck, NOW, true).level).toBe('archive');
  });

  it('is archive with no age when there is no history at all', () => {
    const state = computeConnection([], NOW, true);
    expect(state.level).toBe('archive');
    expect(state.ageMs).toBeNull();
  });

  it('reports the age and the time of the last reading', () => {
    const state = computeConnection(feed(90_000), NOW, true);
    expect(state.ageMs).toBe(90_000);
    expect(state.lastSeenMs).toBe(NOW - 90_000);
  });

  it('passes the link flag through without changing the level', () => {
    const state = computeConnection(feed(1_000), NOW, false);
    expect(state.linkOk).toBe(false);
    expect(state.level).toBe('live');
  });
});

describe('splitAge', () => {
  it.each([
    [60_000, 'min', 1],
    [59 * 60_000, 'min', 59],
    [60 * 60_000, 'hour', 1],
    [47 * 3_600_000, 'hour', 47],
    [48 * 3_600_000, 'day', 2],
    [10 * 24 * 3_600_000, 'day', 10],
  ])('%d ms is %s × %d', (ms, unit, n) => {
    expect(splitAge(ms)).toEqual({ unit, n });
  });
});
