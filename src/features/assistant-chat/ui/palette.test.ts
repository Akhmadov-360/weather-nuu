import { describe, expect, it } from 'vitest';
import { PALETTE, paletteStyle } from './palette';

/** WCAG relative luminance and contrast ratio of two #rrggbb colours. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe('the assistant palette', () => {
  it('has the same colours in both themes', () => {
    expect(Object.keys(PALETTE.light).sort()).toEqual(Object.keys(PALETTE.dark).sort());
  });

  it.each(['dark', 'light'] as const)('keeps the text readable (4.5:1) on every surface in the %s theme', (theme) => {
    const p = PALETTE[theme];
    for (const surface of [p.bg, p.surface]) {
      expect(contrast(p.ink, surface), `ink on ${surface}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.muted, surface), `muted on ${surface}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.accent, surface), `accent on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('turns a palette into CSS variables', () => {
    const style = paletteStyle('light') as Record<string, string>;
    expect(style['--ai-bg']).toBe(PALETTE.light.bg);
    expect(style['--ai-ink']).toBe(PALETTE.light.ink);
  });

  it('is light in the light theme and dark in the dark one', () => {
    expect(luminance(PALETTE.light.bg)).toBeGreaterThan(0.5);
    expect(luminance(PALETTE.dark.bg)).toBeLessThan(0.1);
  });
});
