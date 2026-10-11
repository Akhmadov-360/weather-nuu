import { describe, expect, it } from 'vitest';
import { atmosphereFor, temperatureTint } from './atmosphere';

describe('atmosphereFor', () => {
  it.each([
    [-15, 'snow'],
    [2, 'snow'],
    [2.1, 'calm'],
    [15, 'calm'],
    [28.9, 'calm'],
    [29, 'heat'],
    [38, 'heat'],
  ])('outdoors at %f °C is %s', (temp, kind) => {
    expect(atmosphereFor(temp, 'street')).toBe(kind);
  });

  it('is always calm indoors: no snow or heat shimmer in a classroom', () => {
    for (const t of [-10, 0, 2, 25, 29, 40]) expect(atmosphereFor(t, 'room')).toBe('calm');
  });
});

describe('temperatureTint', () => {
  const hex = /^#[0-9a-f]{6}$/i;

  it('returns hex gradient stops for both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const t of [-30, -10, 5, 18, 26, 45]) {
        const tint = temperatureTint(t, theme);
        expect(tint.from).toMatch(hex);
        expect(tint.to).toMatch(hex);
      }
    }
  });

  it('shifts with the temperature', () => {
    expect(temperatureTint(-10, 'light').from).not.toBe(temperatureTint(35, 'light').from);
  });

  it('uses lighter colours in the light theme than in the dark theme', () => {
    const lum = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
    for (const t of [-10, 10, 22, 35]) {
      expect(lum(temperatureTint(t, 'light').from)).toBeGreaterThan(lum(temperatureTint(t, 'dark').from));
    }
  });
});
