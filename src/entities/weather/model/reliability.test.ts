import { describe, expect, it } from 'vitest';
import { reliabilityStrip } from './reliability';
import type { WeatherHistoryItem } from './weather.types';

const NOW = Date.parse('2026-10-10T12:30:30Z'); // 30 s into the minute 12:30
const MIN = 60_000;

function reading(ms: number): WeatherHistoryItem {
  return { temp: 24, hum: 38, press: 962, mq5: 30, mq3: 3, pm25: null, pm10: null, date: new Date(ms).toISOString() };
}

/** `perMinute` readings in each of the last `minutes` whole minutes, the current one included. */
function steady(perMinute: number, minutes = 60): WeatherHistoryItem[] {
  const startOfCurrent = Math.floor(NOW / MIN) * MIN;
  const out: WeatherHistoryItem[] = [];
  for (let m = minutes - 1; m >= 0; m--) {
    for (let k = 0; k < perMinute; k++) out.push(reading(startOfCurrent - m * MIN + k * 4_000));
  }
  return out;
}

describe('reliabilityStrip', () => {
  it('marks every minute ok when the device reports at its normal rate', () => {
    const r = reliabilityStrip(steady(12), NOW);
    expect(r.buckets).toHaveLength(60);
    expect(r.buckets.every((b) => b === 'ok')).toBe(true);
    expect(r.covered).toBe(60);
  });

  it('marks a thin minute partial and an empty minute a gap', () => {
    const history = steady(12).filter((h) => {
      const minute = Math.floor((Math.floor(NOW / MIN) * MIN - Date.parse(h.date) + MIN - 1) / MIN); // whole minutes ago
      return minute !== 10 && minute !== 20;
    });
    // minute 10 ago -> gap, minute 20 ago -> keep only 3 readings
    const startOfCurrent = Math.floor(NOW / MIN) * MIN;
    for (let k = 0; k < 3; k++) history.push(reading(startOfCurrent - 20 * MIN + k * 4_000));
    const r = reliabilityStrip(history, NOW);
    expect(r.buckets[60 - 1 - 10]).toBe('gap');
    expect(r.buckets[60 - 1 - 20]).toBe('partial');
    expect(r.covered).toBe(59);
  });

  it('treats an empty history as an hour of gaps', () => {
    const r = reliabilityStrip([], NOW);
    expect(r.buckets.every((b) => b === 'gap')).toBe(true);
    expect(r.covered).toBe(0);
  });

  it('ignores readings older than the hour, from the future and with unparsable dates', () => {
    const bad = [reading(NOW - 61 * MIN), reading(NOW + 5 * MIN), { ...reading(NOW), date: 'garbage' }];
    expect(reliabilityStrip(bad, NOW).covered).toBe(0);
  });

  it('does not penalise the minute that has only just begun', () => {
    const justStarted = Math.floor(NOW / MIN) * MIN + 2_000; // 2 s into the minute, nothing received yet
    const r = reliabilityStrip(steady(12, 59), justStarted);
    expect(r.buckets[59]).toBe('ok');
  });

  it('scales the current minute by how much of it has passed', () => {
    // 30 s in: about 6 readings expected, half of that (3) is enough
    const startOfCurrent = Math.floor(NOW / MIN) * MIN;
    const three = [reading(startOfCurrent + 4_000), reading(startOfCurrent + 12_000), reading(startOfCurrent + 20_000)];
    expect(reliabilityStrip(three, NOW).buckets[59]).toBe('ok');
    expect(reliabilityStrip(three.slice(0, 1), NOW).buckets[59]).toBe('partial');
    expect(reliabilityStrip([], NOW).buckets[59]).toBe('gap');
  });

  it('puts the current minute last', () => {
    const r = reliabilityStrip([reading(NOW - 5_000), reading(NOW - 8_000), reading(NOW - 12_000), reading(NOW - 16_000), reading(NOW - 20_000), reading(NOW - 24_000)], NOW);
    expect(r.buckets[59]).toBe('ok');
    expect(r.buckets[58]).toBe('gap');
  });
});
