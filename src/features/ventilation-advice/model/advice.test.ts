import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REASONS, VentilationAdviceSchema, VERDICTS, formatDust, formatRange, verdictTone } from './advice';

const example = JSON.parse(readFileSync(new URL('./advice.example.json', import.meta.url), 'utf8')) as { advice: Record<string, unknown> };

describe('the advice contract', () => {
  it('accepts the documented answer', () => {
    expect(VentilationAdviceSchema.safeParse(example.advice).success).toBe(true);
  });

  it('refuses an outdoor value that is not marked as a model, and an unknown verdict', () => {
    const outside = example.advice.outside as object;
    expect(VentilationAdviceSchema.safeParse({ ...example.advice, outside: { ...outside, kind: 'sensor' } }).success).toBe(false);
    expect(VentilationAdviceSchema.safeParse({ ...example.advice, verdict: 'maybe' }).success).toBe(false);
  });

  it('accepts an answer from an older server that has no waitHours', () => {
    const older: Record<string, unknown> = { ...example.advice };
    delete older.waitHours;
    expect(VentilationAdviceSchema.safeParse(older).success).toBe(true);
    expect(VentilationAdviceSchema.safeParse({ ...older, waitHours: 2 }).success).toBe(true);
  });

  it('lists every verdict and reason that the interface has a text for', () => {
    expect(VERDICTS).toHaveLength(5);
    expect(REASONS).toContain('no_indoor_data');
  });
});

describe('verdictTone', () => {
  it('colours an open window and good air as safe, a shut window as a warning, and the rest as neutral', () => {
    expect(verdictTone('open')).toBe('safe');
    expect(verdictTone('not_needed')).toBe('safe');
    expect(verdictTone('dont_open')).toBe('warning');
    expect(verdictTone('wait')).toBe('neutral');
    expect(verdictTone('unknown')).toBe('neutral');
  });
});

describe('numbers', () => {
  it('shows one decimal at most, with the comma or the point of the language', () => {
    expect(formatDust(48.24, 'en')).toBe('48.2');
    expect(formatDust(48, 'en')).toBe('48');
    expect(formatDust(48.24, 'ru')).toBe('48,2');
    expect(formatDust(48.24, 'uz')).toBe('48.2');
  });

  it('shows a range only when it is wider than the number itself', () => {
    expect(formatRange([14.9, 24.3], 'en')).toBe('14.9–24.3');
    expect(formatRange([17.6, 17.8], 'en')).toBeNull();
    expect(formatRange(null, 'en')).toBeNull();
  });
});
