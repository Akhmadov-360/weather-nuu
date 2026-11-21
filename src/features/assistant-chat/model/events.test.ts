import { describe, expect, it } from 'vitest';
import example from './assistant.example.json';
import { ASSISTANT_ERROR_CODES, AssistantEventSchema, HISTORY_MAX_CHARS, HISTORY_MAX_MESSAGES, MESSAGE_MAX_CHARS } from './events';

describe('assistant events', () => {
  it('accepts every event of the contract example (a copy of the backend example file)', () => {
    for (const event of example.events) {
      expect(AssistantEventSchema.safeParse(event).success, JSON.stringify(event)).toBe(true);
    }
  });

  it('rejects an unknown event type and an unknown error code', () => {
    expect(AssistantEventSchema.safeParse({ type: 'thought', delta: 'x' }).success).toBe(false);
    expect(AssistantEventSchema.safeParse({ type: 'error', code: 'oops' }).success).toBe(false);
  });

  it('lists the same error codes as the backend contract', () => {
    expect([...ASSISTANT_ERROR_CODES].sort()).toEqual(['bad_request', 'disabled', 'internal', 'quota', 'rate_limited', 'upstream']);
  });

  it('uses the same limits as the backend contract', () => {
    expect([MESSAGE_MAX_CHARS, HISTORY_MAX_MESSAGES, HISTORY_MAX_CHARS]).toEqual([1000, 10, 6000]);
  });
});
