import { z } from 'zod';

/**
 * The answer stream and the limits, as the backend contract defines them
 * (weather-backend: packages/contracts/src/schemas/assistant.ts). Kept here as a copy because the
 * two repositories do not share code; `assistant.example.json` is the same file in both and the
 * tests of each side check it, so a change on one side breaks the other side's tests.
 */
export const MESSAGE_MAX_CHARS = 1000;
export const HISTORY_MAX_MESSAGES = 10;
export const HISTORY_MAX_CHARS = 6000;

export const ASSISTANT_ERROR_CODES = ['disabled', 'rate_limited', 'quota', 'upstream', 'bad_request', 'internal'] as const;
export type AssistantErrorCode = (typeof ASSISTANT_ERROR_CODES)[number];

/** The codes the server sends, plus the one the client adds when the request never reached it. */
export type ChatErrorCode = AssistantErrorCode | 'offline';

export type AssistantLang = 'ru' | 'uz' | 'en';
export type AssistantContext = 'room' | 'street';

/** A turn of the dialogue as it is sent to the server: only what people and the assistant said. */
export type HistoryMessage = { role: 'user' | 'assistant'; content: string };

export const AssistantEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), delta: z.string() }),
  z.object({ type: z.literal('tool_start'), id: z.string(), name: z.string() }),
  z.object({ type: z.literal('tool_end'), id: z.string(), name: z.string(), ok: z.boolean() }),
  z.object({
    type: z.literal('citations'),
    items: z.array(z.object({ id: z.string(), title: z.string(), source: z.string() })),
  }),
  z.object({ type: z.literal('done'), inputTokens: z.number(), outputTokens: z.number() }),
  z.object({ type: z.literal('error'), code: z.enum(ASSISTANT_ERROR_CODES) }),
]);
export type AssistantEvent = z.infer<typeof AssistantEventSchema>;

/** What the chat reacts to: the server's events, and a client-side `offline` error. */
export type ChatEvent = Exclude<AssistantEvent, { type: 'error' }> | { type: 'error'; code: ChatErrorCode };
