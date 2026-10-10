import { getTimes } from 'suncalc';
import { describe, expect, it } from 'vitest';
import { phaseAt, type PhaseTimes } from './phase';
import { skyState } from './position';

const LAT = 41.343;
const LON = 69.205;
const OFFSET = 300; // Tashkent, UTC+5

describe('phaseAt', () => {
  const t: PhaseTimes = { dawn: 100, sunrise: 200, goldenHourEnd: 300, goldenHour: 700, sunset: 800, dusk: 900 };

  it.each([
    [0, 'night'],
    [99, 'night'],
    [100, 'dawn'],
    [199, 'dawn'],
    [200, 'morning'],
    [299, 'morning'],
    [300, 'day'],
    [699, 'day'],
    [700, 'evening'],
    [799, 'evening'],
    [800, 'dusk'],
    [899, 'dusk'],
    [900, 'night'],
    [5000, 'night'],
  ])('at %i the phase is %s', (now, phase) => {
    expect(phaseAt(now, t)).toBe(phase);
  });
});

describe('skyState (Tashkent, 10 October 2026)', () => {
  const local = (h: number, m = 0) => Date.UTC(2026, 9, 10, h, m) - OFFSET * 60_000;

  it('at local noon it is day and the sun is high on the arc', () => {
    const s = skyState(local(12), LAT, LON, OFFSET)!;
    expect(s.phase).toBe('day');
    expect(s.luminary).toBe('sun');
    expect(s.progress).toBeGreaterThan(0.4);
    expect(s.progress).toBeLessThan(0.6);
    expect(s.sunrise).toBeLessThan(s.sunset);
  });

  it('at 02:00 it is night and the moon is on its arc', () => {
    const s = skyState(local(2), LAT, LON, OFFSET)!;
    expect(s.phase).toBe('night');
    expect(s.luminary).toBe('moon');
    expect(s.progress).toBeGreaterThan(0);
    expect(s.progress).toBeLessThan(1);
    expect(s.moonPhase).toBeGreaterThanOrEqual(0);
    expect(s.moonPhase).toBeLessThanOrEqual(1);
  });

  it('hands the arc from the sun to the moon at sunset', () => {
    const sunset = getTimes(new Date(local(12)), LAT, LON, 0, OFFSET).sunset!.getTime();
    const before = skyState(sunset - 1000, LAT, LON, OFFSET)!;
    const after = skyState(sunset + 1000, LAT, LON, OFFSET)!;
    expect(before.luminary).toBe('sun');
    expect(before.progress).toBeGreaterThan(0.99);
    expect(after.luminary).toBe('moon');
    expect(after.progress).toBeLessThan(0.05);
  });

  it('reports where the arc of the visible body starts and ends', () => {
    const day = skyState(local(12), LAT, LON, OFFSET)!;
    expect(day.arcStart).toBe(day.sunrise);
    expect(day.arcEnd).toBe(day.sunset);

    const evening = skyState(local(21), LAT, LON, OFFSET)!;
    expect(evening.luminary).toBe('moon');
    expect(evening.arcStart).toBe(evening.sunset); // tonight's arc begins at today's sunset
    expect(evening.arcEnd).toBeGreaterThan(local(24)); // and ends at tomorrow's sunrise

    const small = skyState(local(2), LAT, LON, OFFSET)!;
    expect(small.arcStart).toBeLessThan(local(0)); // yesterday's sunset
    expect(small.arcEnd).toBe(small.sunrise);
  });

  it('keeps the moon arc continuous across midnight', () => {
    const a = skyState(local(23, 59), LAT, LON, OFFSET)!;
    const b = skyState(local(24, 1), LAT, LON, OFFSET)!;
    expect(a.luminary).toBe('moon');
    expect(b.luminary).toBe('moon');
    expect(Math.abs(b.progress - a.progress)).toBeLessThan(0.02);
  });

  it('returns null when the sun does not rise or set (polar day)', () => {
    expect(skyState(Date.UTC(2026, 5, 21, 12), 89, 0, 0)).toBeNull();
  });
});
