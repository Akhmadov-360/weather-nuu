import { z } from 'zod';

/**
 * The answer of `GET /v1/ventilation/advice`, as the backend contract defines it (weather-backend:
 * packages/contracts/src/schemas/ventilation.ts). A copy, because the two repositories share no code;
 * `advice.example.json` is the same file on both sides and the tests of each side check it.
 */
export const VERDICTS = ['open', 'dont_open', 'wait', 'not_needed', 'unknown'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const REASONS = [
  'outside_cleaner',
  'outside_worse',
  'outside_dirty',
  'no_gain',
  'comfort',
  'already_good',
  'forecast_better',
  'no_outdoor_data',
  'no_indoor_data',
] as const;
export type Reason = (typeof REASONS)[number];

const Instant = z.string().datetime({ offset: true });

export const VentilationAdviceSchema = z.object({
  verdict: z.enum(VERDICTS),
  reason: z.enum(REASONS),
  computedAt: Instant,
  inside: z.object({ pm25: z.number(), at: Instant }).nullable(),
  outside: z
    .object({ pm25: z.number(), at: Instant, kind: z.literal('model'), source: z.string(), attributionUrl: z.string().url() })
    .nullable(),
  outsideTemp: z.number().nullable(),
  horizonMinutes: z.number().int().positive(),
  predicted: z.number().nullable(),
  predictedRange: z.tuple([z.number(), z.number()]).nullable(),
  gain: z.number().nullable(),
  lambda: z.object({ value: z.number().positive(), source: z.enum(['data', 'prior']), verified: z.boolean(), range: z.tuple([z.number(), z.number()]).nullable() }),
  forecast: z.array(z.object({ hours: z.number(), value: z.number() })),
});
export type VentilationAdvice = z.infer<typeof VentilationAdviceSchema>;

/** How the verdict is coloured: an open window and good air are "safe", a window better left shut is a warning, the rest is neutral. */
export type Tone = 'safe' | 'warning' | 'neutral';

export function verdictTone(verdict: Verdict): Tone {
  switch (verdict) {
    case 'open':
    case 'not_needed':
      return 'safe';
    case 'dont_open':
      return 'warning';
    default:
      return 'neutral';
  }
}

/** The number that the card shows with a decimal comma or point by the language, one digit, no trailing zero noise. */
export function formatDust(value: number, language: string): string {
  return new Intl.NumberFormat(language.startsWith('uz') ? 'en' : language, { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format(value);
}

/** The range of the expected dust as "15–24", or `null` when it is not known or is as narrow as the number itself. */
export function formatRange(range: readonly [number, number] | null, language: string): string | null {
  if (!range) return null;
  const [low, high] = range;
  if (Math.abs(high - low) < 0.5) return null;
  return `${formatDust(low, language)}–${formatDust(high, language)}`;
}
