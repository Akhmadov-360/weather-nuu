import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'globals.css'), 'utf8');

const TEXT = ['--text-primary', '--text-secondary', '--text-muted'];
const STATUS = ['--status-safe', '--status-warning', '--status-critical', '--status-info'];
const SENSORS = ['--sensor-temp', '--sensor-hum', '--sensor-press', '--sensor-pm25', '--sensor-pm10', '--sensor-mq5', '--sensor-mq3'];

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

describe.each(['light', 'dark'] as const)('palette tokens (%s theme)', (theme) => {
  const tokens = block(theme);
  const surface = tokens['--surface'];

  it('defines the card surface and every colour token as a hex value', () => {
    expect(surface).toMatch(/^#[0-9a-f]{6}$/i);
    for (const name of [...TEXT, ...STATUS, ...SENSORS]) {
      expect(tokens[name], name).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it.each([...TEXT, ...STATUS])('%s is readable on the card surface (4.5:1)', (name) => {
    expect(contrast(tokens[name]!, surface!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SENSORS)('%s is visible on the card surface (3:1)', (name) => {
    expect(contrast(tokens[name]!, surface!)).toBeGreaterThanOrEqual(3);
  });
});
