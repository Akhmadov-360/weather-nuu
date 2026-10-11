import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { temperatureTint } from '@/widgets/weather-summary/model/atmosphere';

const css = readFileSync(resolve(__dirname, 'globals.css'), 'utf8');

function block(theme: 'dark' | 'light'): Record<string, string> {
  const m = new RegExp(String.raw`/\* PALETTE:${theme} \*/\s*[^{]+\{([^}]*)\}`).exec(css);
  expect(m, `PALETTE:${theme} block`).not.toBeNull();
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

describe.each(['light', 'dark'] as const)('temperature tint (%s theme)', (theme) => {
  const tokens = block(theme);
  const temps = Array.from({ length: 15 }, (_, i) => -25 + i * 5); // -25 ... 45

  it.each(temps)('text stays readable on the tint at %i °C (4.5:1)', (temp) => {
    const tint = temperatureTint(temp, theme);
    for (const stop of [tint.from, tint.to]) {
      expect(contrast(tokens['--text-primary']!, stop)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens['--text-secondary']!, stop)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
