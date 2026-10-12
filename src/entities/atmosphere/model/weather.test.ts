import { describe, expect, it } from 'vitest';
import { describeWeather, effectiveTemperature, type Weather } from './weather';

const base = { precipitation: 0, cloud: 0, windKmh: 0, windDirDeg: 0, isDay: true };
const weather = (over: Partial<Weather> = {}): Weather => ({
  condition: 'clear',
  temp: 20,
  intensity: 0,
  cloud: 0,
  windX: 0,
  isDay: true,
  ...over,
});

describe('describeWeather: condition from the WMO code', () => {
  it.each([
    [0, 'clear'],
    [1, 'clouds'],
    [2, 'clouds'],
    [3, 'clouds'],
    [45, 'fog'],
    [48, 'fog'],
    [51, 'drizzle'],
    [53, 'drizzle'],
    [55, 'drizzle'],
    [56, 'sleet'],
    [57, 'sleet'],
    [61, 'rain'],
    [63, 'rain'],
    [65, 'rain'],
    [66, 'sleet'],
    [67, 'sleet'],
    [71, 'snow'],
    [73, 'snow'],
    [75, 'snow'],
    [77, 'snow'],
    [80, 'shower'],
    [82, 'shower'],
    [85, 'blizzard'],
    [86, 'blizzard'],
    [95, 'thunder'],
    [96, 'hail'],
    [99, 'hail'],
  ])('code %d is %s', (code, condition) => {
    expect(describeWeather(code, 15, base).condition).toBe(condition);
  });

  it('treats an unknown code as clear', () => {
    expect(describeWeather(1234, 15, base).condition).toBe('clear');
  });
});

describe('describeWeather: temperature decides between rain and snow', () => {
  it('turns rain into sleet at or below 0 °C and into snow at −2 °C or colder', () => {
    expect(describeWeather(63, 1, base).condition).toBe('rain');
    expect(describeWeather(63, 0, base).condition).toBe('sleet');
    expect(describeWeather(63, -2, base).condition).toBe('snow');
    expect(describeWeather(53, -3, base).condition).toBe('snow');
    expect(describeWeather(81, -1, base).condition).toBe('sleet');
  });

  it('leaves thunderstorms and hail alone', () => {
    expect(describeWeather(95, -5, base).condition).toBe('thunder');
    expect(describeWeather(96, -5, base).condition).toBe('hail');
  });
});

describe('describeWeather: numbers', () => {
  it('keeps intensity in 0..1 and grows it with precipitation', () => {
    const light = describeWeather(63, 12, { ...base, precipitation: 0.2 }).intensity;
    const heavy = describeWeather(63, 12, { ...base, precipitation: 9 }).intensity;
    expect(light).toBeGreaterThan(0);
    expect(heavy).toBeGreaterThan(light);
    expect(heavy).toBeLessThanOrEqual(1);
    expect(describeWeather(0, 12, base).intensity).toBe(0);
  });

  it('turns cloud cover percent into 0..1', () => {
    expect(describeWeather(3, 12, { ...base, cloud: 60 }).cloud).toBeCloseTo(0.6);
    expect(describeWeather(3, 12, { ...base, cloud: 400 }).cloud).toBe(1);
  });

  it('pushes particles the way the wind blows (a west wind blows east)', () => {
    const west = describeWeather(0, 12, { ...base, windKmh: 20, windDirDeg: 270 }).windX;
    const east = describeWeather(0, 12, { ...base, windKmh: 20, windDirDeg: 90 }).windX;
    expect(west).toBeGreaterThan(0);
    expect(east).toBeLessThan(0);
    expect(describeWeather(0, 12, { ...base, windKmh: 500, windDirDeg: 270 }).windX).toBeLessThanOrEqual(150);
  });

  it('carries the temperature and the day flag', () => {
    const w = describeWeather(0, 31.5, { ...base, isDay: false });
    expect(w.temp).toBe(31.5);
    expect(w.isDay).toBe(false);
  });
});

describe('effectiveTemperature', () => {
  it('prefers the station sensor while it reports', () => {
    expect(effectiveTemperature(30, weather({ temp: 5 }))).toBe(30);
  });

  it('falls back to the weather service when the sensor is silent', () => {
    expect(effectiveTemperature(null, weather({ temp: 31 }))).toBe(31);
    expect(effectiveTemperature(Number.NaN, weather({ temp: 31 }))).toBe(31);
  });

  it('is null when neither is available', () => {
    expect(effectiveTemperature(null, null)).toBeNull();
  });
});
