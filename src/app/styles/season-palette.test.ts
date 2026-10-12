import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'globals.css'), 'utf8');

function paletteBlock(theme: 'dark' | 'light'): Record<string, string> {
  const m = new RegExp(String.raw`/\* PALETTE:${theme} \*/\s*[^{]+\{([^}]*)\}`).exec(css);
  expect(m, `PALETTE:${theme} block`).not.toBeNull();
  const out: Record<string, string> = {};
  for (const [, name, value] of m![1]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[name!] = value!.trim();
  return out;
}

function seasonBlock(season: string, theme: 'dark' | 'light'): Record<string, string> {
  const m = new RegExp(String.raw`/\* SEASON:${season}:${theme} \*/\s*[^{]+\{([^}]*)\}`).exec(css);
  expect(m, `SEASON:${season}:${theme} block`).not.toBeNull();
  const out: Record<string, string> = {};
  for (const [, name, value] of m![1]!.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[name!] = value!.trim();
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const SEASONS = ['winter', 'spring', 'summer', 'autumn'] as const;
const TOKENS = ['--season-accent', '--season-sky-from', '--season-sky-to', '--season-header-tint'] as const;

describe.each(SEASONS)('season palette: %s', (season) => {
  describe.each(['light', 'dark'] as const)('%s theme', (theme) => {
    const palette = paletteBlock(theme);
    const tokens = seasonBlock(season, theme);

    it('defines every token as a hex colour', () => {
      for (const name of TOKENS) expect(tokens[name], name).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it.each(['--season-sky-from', '--season-sky-to', '--season-header-tint'])('text stays readable on %s (4.5:1)', (name) => {
      expect(contrast(palette['--text-primary']!, tokens[name]!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette['--text-secondary']!, tokens[name]!)).toBeGreaterThanOrEqual(4.5);
    });

    it('keeps the accent readable as text on the card surface (4.5:1, used by the greeting)', () => {
      expect(contrast(tokens['--season-accent']!, palette['--surface']!)).toBeGreaterThanOrEqual(4.5);
    });

    it('ends the sky in the page colour so there is no seam', () => {
      expect(tokens['--season-sky-to']!.toLowerCase()).toBe(palette['--paper']!.toLowerCase());
    });
  });
});
