import { describe, expect, it } from 'vitest';
import { orbToneFor } from './orb-tone';

describe('orbToneFor', () => {
  it('is good for clean air', () => {
    expect(orbToneFor(5)).toBe('good');
    expect(orbToneFor(9)).toBe('good');
  });

  it('is warn for raised dust (moderate and unhealthy for sensitive groups)', () => {
    expect(orbToneFor(12)).toBe('warn');
    expect(orbToneFor(20)).toBe('warn');
    expect(orbToneFor(40)).toBe('warn');
  });

  it('is bad for unhealthy dust and worse', () => {
    expect(orbToneFor(80)).toBe('bad');
    expect(orbToneFor(150)).toBe('bad');
  });

  it('is idle when there is no reading: no dust sensor, a failed read, or nothing loaded yet', () => {
    expect(orbToneFor(null)).toBe('idle');
    expect(orbToneFor(undefined)).toBe('idle');
  });
});
