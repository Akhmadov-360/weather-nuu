import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { categoryCssVar, categoryTextCssVar, US_EPA_2024 } from '@/shared/lib/air-quality';

const css = readFileSync(resolve(__dirname, 'globals.css'), 'utf8');
const IDS = US_EPA_2024.breakpoints.pm25.map((row) => row.category);
const BASE = { dark: '#0f172a', light: '#ffffff' } as const;

function block(theme: 'dark' | 'light'): Record<string, string> {
  const m = new RegExp(String.raw`/\* AQI:${theme} \*/\s*[^{]+\{([^}]*)\}`).exec(css);
  expect(m, `AQI:${theme} block`).not.toBeNull();
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

describe.each(['dark', 'light'] as const)('AQI tokens (%s theme)', (theme) => {
  const tokens = block(theme);

  it.each(IDS)('%s has a fill and a text colour as hex', (id) => {
    expect(tokens[categoryCssVar(id)]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(tokens[categoryTextCssVar(id)]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it.each(IDS)('%s text reaches 4.5:1 against the theme base', (id) => {
    expect(contrast(tokens[categoryTextCssVar(id)]!, BASE[theme])).toBeGreaterThanOrEqual(4.5);
  });
});
