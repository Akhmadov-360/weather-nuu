import { describe, expect, it } from 'vitest';
import { atmosphereFor, temperatureTint, thermometerColor } from './atmosphere';

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

describe('thermometerColor', () => {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi! + 0.05) / (lo! + 0.05);
  };

  it('is cold at the bottom of the scale and hot at the top', () => {
    expect(thermometerColor(-20, 'light')).not.toBe(thermometerColor(40, 'light'));
    expect(thermometerColor(-50, 'light')).toBe(thermometerColor(-20, 'light')); // clamps
    expect(thermometerColor(80, 'dark')).toBe(thermometerColor(40, 'dark'));
  });

  it.each([
    ['light', '#FFFFFF'],
    ['dark', '#151A3D'],
  ] as const)('stays visible on the card surface in the %s theme (3:1) at every degree', (theme, surface) => {
    for (let t = -20; t <= 40; t++) {
      expect(contrast(thermometerColor(t, theme), surface), `${t} °C`).toBeGreaterThanOrEqual(3);
    }
  });
});
