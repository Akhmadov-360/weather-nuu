import { describe, expect, it } from 'vitest';
import { buildDustCardModel } from './dust-card';
import type { WeatherHistoryItem } from './weather.types';

const NOW = Date.parse('2026-10-10T12:00:00Z');
const STEP = 5_000;

function points(count: number, pm25: number | null, pm10: number | null = null, endAgoMs = 0): WeatherHistoryItem[] {
  return Array.from({ length: count }, (_, i) => ({
    temp: 24, hum: 38, press: 962, mq5: 30, mq3: 3, pm25, pm10,
    date: new Date(NOW - endAgoMs - (count - 1 - i) * STEP).toISOString(),
  }));
}

describe('buildDustCardModel', () => {
  it('street never shows dust, even if the history carries values', () => {
    const m = buildDustCardModel({ source: 'street', history: points(120, 12.5), dayMean: null, nowMs: NOW });
    expect(m).toEqual({ kind: 'no_sensor' });
  });

  it('room with 59 points in the window has no usable reading and reports when dust was last seen', () => {
    const history = points(59, 12.5);
    const m = buildDustCardModel({ source: 'room', history, dayMean: null, nowMs: NOW });
    expect(m).toEqual({ kind: 'no_data', lastSeen: history[58]!.date });
  });

  it('room that never reported dust says no data with no last-seen time', () => {
    const m = buildDustCardModel({ source: 'room', history: points(200, null), dayMean: null, nowMs: NOW });
    expect(m).toEqual({ kind: 'no_data', lastSeen: null });
  });

  it('room with 60 points is ready: mean, AQI and category come from the standard', () => {
    const m = buildDustCardModel({ source: 'room', history: points(60, 12.5), dayMean: null, nowMs: NOW });
    expect(m.kind).toBe('ready');
    if (m.kind !== 'ready') return;
    expect(m.pm25).toEqual({ mean: 12.5, aqi: 57, category: 'moderate' });
    expect(m.windowPoints).toBe(60);
  });

  it('pm10 is null when only pm25 has enough points', () => {
    const m = buildDustCardModel({ source: 'room', history: points(60, 12.5, null), dayMean: null, nowMs: NOW });
    expect(m.kind === 'ready' && m.pm10).toBeNull();
  });

  it('pm10 gets its own category from the same standard', () => {
    const m = buildDustCardModel({ source: 'room', history: points(60, 12.5, 60), dayMean: null, nowMs: NOW });
    expect(m.kind === 'ready' && m.pm10).toEqual({ mean: 60, aqi: 53, category: 'moderate' });
  });

  it('24 h line needs 75% coverage: 0.74 hides it, 0.75 shows it', () => {
    const base = { source: 'room' as const, history: points(60, 12.5), nowMs: NOW };
    const low = buildDustCardModel({ ...base, dayMean: { mean: 8, coverage: 0.74 } });
    const ok = buildDustCardModel({ ...base, dayMean: { mean: 8, coverage: 0.75 } });
    expect(low.kind === 'ready' && low.day).toBeNull();
    expect(ok.kind === 'ready' && ok.day).toEqual({ mean: 8, aqi: 44, category: 'good' });
  });

  it('a missing 24 h result (loading or failed) leaves the 10-minute block intact', () => {
    const m = buildDustCardModel({ source: 'room', history: points(60, 12.5), dayMean: undefined, nowMs: NOW });
    expect(m.kind).toBe('ready');
    expect(m.kind === 'ready' && m.day).toBeNull();
  });
});
