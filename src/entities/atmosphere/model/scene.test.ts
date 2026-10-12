import { describe, expect, it } from 'vitest';
import { describeScene, type LayerKind } from './scene';
import type { Weather } from './weather';

/** Noon in Tashkent on the given day. */
const at = (iso: string) => new Date(`${iso}T07:00:00Z`);

const weather = (over: Partial<Weather> = {}): Weather => ({
  condition: 'clear',
  temp: 20,
  intensity: 0,
  cloud: 0,
  windX: 0,
  isDay: true,
  ...over,
});

const kinds = (layers: { kind: LayerKind }[]) => layers.map((l) => l.kind);
const MAY = '2026-05-12';
const OCT = '2026-10-15';
const JAN = '2027-02-10';
const JUL = '2026-07-15';

describe('describeScene: the classroom', () => {
  it('shows the season but never real weather', () => {
    const scene = describeScene({ date: at(MAY), source: 'room', weather: weather({ condition: 'thunder', intensity: 1 }), streetTemp: null });
    expect(kinds(scene.layers)).toEqual(['petals']);
  });

  it.each([
    [MAY, 'petals'],
    [OCT, 'leaves'],
    [JAN, 'snow'],
    [JUL, 'motes'],
  ] as const)('on %s the seasonal layer is %s', (day, kind) => {
    const scene = describeScene({ date: at(day), source: 'room', weather: null, streetTemp: null });
    expect(kinds(scene.layers)).toContain(kind);
    expect(scene.layers.find((l) => l.kind === kind)!.intensity).toBeLessThanOrEqual(0.4);
  });
});

describe('describeScene: the street', () => {
  it('turns a thunderstorm into rain plus lightning, and the storm outranks the rain', () => {
    const scene = describeScene({ date: at(MAY), source: 'street', weather: weather({ condition: 'thunder', intensity: 0.9 }), streetTemp: 18 });
    expect(kinds(scene.layers)).toEqual(expect.arrayContaining(['rain', 'lightning']));
    expect(kinds(scene.layers)).not.toContain('petals');
  });

  it('draws rain, drizzle and showers as rain, hail as hail, sleet as both', () => {
    const run = (condition: Weather['condition']) =>
      kinds(describeScene({ date: at(MAY), source: 'street', weather: weather({ condition, intensity: 0.5 }), streetTemp: 10 }).layers);
    expect(run('rain')).toContain('rain');
    expect(run('drizzle')).toContain('rain');
    expect(run('shower')).toContain('rain');
    expect(run('hail')).toContain('hail');
    expect(run('sleet')).toEqual(expect.arrayContaining(['rain', 'snow']));
    expect(run('blizzard')).toContain('snow');
  });

  it('shows fog, clouds, sun rays by day and stars by night', () => {
    const run = (w: Partial<Weather>) => kinds(describeScene({ date: at(MAY), source: 'street', weather: weather(w), streetTemp: 20 }).layers);
    expect(run({ condition: 'fog', intensity: 0.5 })).toContain('fog');
    expect(run({ condition: 'clouds', cloud: 0.8 })).toContain('clouds');
    expect(run({ condition: 'clear', isDay: true })).toContain('rays');
    expect(run({ condition: 'clear', isDay: false })).toContain('stars');
  });

  it('hands the wind to every layer', () => {
    const scene = describeScene({ date: at(MAY), source: 'street', weather: weather({ condition: 'rain', intensity: 0.5, windX: 40 }), streetTemp: 10 });
    expect(scene.layers.every((l) => l.windX === 40)).toBe(true);
  });

  it('snows below +2 °C on the sensor alone (as the temperature card always did)', () => {
    const scene = describeScene({ date: at(MAY), source: 'street', weather: null, streetTemp: 1 });
    expect(kinds(scene.layers)).toContain('snow');
  });

  it('shimmers from 29 °C and frosts from −5 °C', () => {
    expect(kinds(describeScene({ date: at(JUL), source: 'street', weather: null, streetTemp: 31 }).layers)).toContain('shimmer');
    expect(kinds(describeScene({ date: at(JAN), source: 'street', weather: null, streetTemp: -6 }).layers)).toContain('frost');
    expect(kinds(describeScene({ date: at(JUL), source: 'street', weather: null, streetTemp: 28.9 }).layers)).not.toContain('shimmer');
  });

  it('keeps the heat effect when the sensor is silent, using the weather service temperature', () => {
    const scene = describeScene({ date: at(JUL), source: 'street', weather: weather({ condition: 'clear', temp: 31 }), streetTemp: null });
    expect(kinds(scene.layers)).toContain('shimmer');
  });

  it('carries cloud cover and the day flag to the sky', () => {
    const scene = describeScene({ date: at(MAY), source: 'street', weather: weather({ cloud: 0.7, isDay: false }), streetTemp: 15 });
    expect(scene.sky).toEqual({ cloud: 0.7, isDay: false });
  });
});

describe('describeScene: events', () => {
  it('turns on lights, confetti and heavier snow at New Year', () => {
    const scene = describeScene({ date: at('2026-12-31'), source: 'room', weather: null, streetTemp: null });
    expect(scene.lights).toBe(true);
    expect(scene.confetti).toBe(true);
    expect(scene.event).toBe('new_year');
    expect(scene.greeting).toBe('new_year');
    expect(scene.layers.find((l) => l.kind === 'snow')!.intensity).toBeGreaterThanOrEqual(0.7);
  });

  it('gives Navruz petals and confetti, the Constitution Day a greeting only', () => {
    const navruz = describeScene({ date: at('2026-03-21'), source: 'room', weather: null, streetTemp: null });
    expect(kinds(navruz.layers)).toContain('petals');
    expect(navruz.confetti).toBe(true);
    const constitution = describeScene({ date: at('2026-12-08'), source: 'room', weather: null, streetTemp: null });
    expect(constitution.confetti).toBe(false);
    expect(constitution.greeting).toBe('constitution');
  });

  it('has no greeting or lights on an ordinary day', () => {
    const scene = describeScene({ date: at(MAY), source: 'room', weather: null, streetTemp: null });
    expect(scene.greeting).toBeNull();
    expect(scene.lights).toBe(false);
    expect(scene.confetti).toBe(false);
  });
});
