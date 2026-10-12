import { describe, expect, it } from 'vitest';
import { buildOpenMeteoUrl, mapOpenMeteo } from './open-meteo';

const sample = {
  latitude: 41.35,
  longitude: 69.2,
  current: {
    time: '2026-10-12T20:00',
    weather_code: 63,
    temperature_2m: 14.2,
    precipitation: 2.4,
    cloud_cover: 90,
    wind_speed_10m: 18,
    wind_direction_10m: 270,
    is_day: 0,
  },
};

describe('buildOpenMeteoUrl', () => {
  it('asks for the current block at the station, in its time zone', () => {
    const url = new URL(buildOpenMeteoUrl());
    expect(url.origin).toBe('https://api.open-meteo.com');
    expect(url.searchParams.get('latitude')).toBe('41.343');
    expect(url.searchParams.get('longitude')).toBe('69.205');
    expect(url.searchParams.get('timezone')).toBe('Asia/Tashkent');
    expect(url.searchParams.get('current')?.split(',').sort()).toEqual(
      ['weather_code', 'temperature_2m', 'precipitation', 'cloud_cover', 'wind_speed_10m', 'wind_direction_10m', 'is_day'].sort(),
    );
  });
});

describe('mapOpenMeteo', () => {
  it('maps a real response', () => {
    const w = mapOpenMeteo(sample)!;
    expect(w.condition).toBe('rain');
    expect(w.temp).toBe(14.2);
    expect(w.cloud).toBeCloseTo(0.9);
    expect(w.isDay).toBe(false);
    expect(w.windX).toBeGreaterThan(0);
    expect(w.intensity).toBeGreaterThan(0.15);
  });

  it.each([
    ['not an object', 'rain'],
    ['null', null],
    ['no current block', { latitude: 1 }],
    ['current is not an object', { current: 5 }],
    ['a missing field', { current: { ...sample.current, temperature_2m: undefined } }],
    ['a string instead of a number', { current: { ...sample.current, weather_code: '63' } }],
    ['NaN', { current: { ...sample.current, cloud_cover: Number.NaN } }],
  ])('returns null for %s', (_name, raw) => {
    expect(mapOpenMeteo(raw)).toBeNull();
  });

  it('ignores unexpected extra fields', () => {
    expect(mapOpenMeteo({ ...sample, current: { ...sample.current, surprise: 1 } })).not.toBeNull();
  });
});
