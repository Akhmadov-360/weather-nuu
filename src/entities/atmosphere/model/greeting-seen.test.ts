import { describe, expect, it } from 'vitest';
import { loadSeen, markGreetingSeen, shouldShowGreeting } from './greeting-seen';

describe('shouldShowGreeting', () => {
  it('shows a greeting the first time on a day', () => {
    expect(shouldShowGreeting('navruz', '2026-03-21', {})).toBe(true);
  });

  it('shows it only once a day per event', () => {
    const seen = markGreetingSeen('navruz', '2026-03-21', {});
    expect(shouldShowGreeting('navruz', '2026-03-21', seen)).toBe(false);
    expect(shouldShowGreeting('navruz', '2026-03-22', seen)).toBe(true);
  });

  it('keeps events apart', () => {
    const seen = markGreetingSeen('navruz', '2026-03-21', {});
    expect(shouldShowGreeting('independence', '2026-03-21', seen)).toBe(true);
  });

  it('shows nothing without an event', () => {
    expect(shouldShowGreeting(null, '2026-03-21', {})).toBe(false);
  });
});

describe('loadSeen', () => {
  it('reads a stored map', () => {
    expect(loadSeen('{"navruz":"2026-03-21"}')).toEqual({ navruz: '2026-03-21' });
  });

  it.each([[null], ['not json'], ['[]'], ['"x"'], ['{"navruz":5}'], ['null']])('survives %s', (raw) => {
    const result = loadSeen(raw as string | null);
    expect(typeof result).toBe('object');
    expect(Object.values(result).every((v) => typeof v === 'string')).toBe(true);
  });
});
