import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'globals.css'), 'utf8');
const PHASES = ['night', 'dawn', 'morning', 'day', 'evening', 'dusk'];

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

describe.each(['light', 'dark'] as const)('sky tokens (%s theme)', (theme) => {
  const tokens = block(theme);

  it.each(PHASES)('%s defines both gradient stops as hex', (phase) => {
    expect(tokens[`--sky-${phase}-from`], `${phase} from`).toMatch(/^#[0-9a-f]{6}$/i);
    expect(tokens[`--sky-${phase}-to`], `${phase} to`).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it.each(PHASES)('text stays readable on the %s sky (4.5:1)', (phase) => {
    for (const stop of ['from', 'to'] as const) {
      const sky = tokens[`--sky-${phase}-${stop}`]!;
      expect(contrast(tokens['--text-primary']!, sky), `primary on ${phase} ${stop}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens['--text-secondary']!, sky), `secondary on ${phase} ${stop}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
