import { z } from 'zod';
import type { ChatMessage, ChatState } from './conversation';
import { HISTORY_MAX_CHARS } from './events';

export const STORAGE_KEY = 'assistant-chat-v1';
export const MAX_SAVED_MESSAGES = 20;
/** A saved conversation is forgotten after a week. */
export const SAVED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const MessageSchema = z.object({
  id: z.string().min(1).max(32),
  role: z.enum(['user', 'assistant']),
  text: z.string().min(1).max(HISTORY_MAX_CHARS),
  interrupted: z.boolean().optional(),
  tool: z.object({ name: z.string().max(64), status: z.enum(['working', 'done', 'error']) }).optional(),
  sources: z
    .array(z.object({ id: z.string().max(80), title: z.string().max(300), source: z.string().max(200), url: z.string().max(300).optional() }))
    .max(8)
    .optional(),
});

const SavedSchema = z.object({
  v: z.literal(1),
  savedAt: z.number(),
  messages: z.array(MessageSchema).max(MAX_SAVED_MESSAGES),
});

// The browser may refuse to keep notes (private mode, blocked storage): then nothing is remembered and nothing breaks.
function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Keeps the last conversation on this device (never on the server: the server remembers nothing).
 * It is saved only when no answer is arriving, so a half-written answer is never kept.
 */
export function saveConversation(state: ChatState, now: number = Date.now()): void {
  if (state.status === 'streaming') return;
  try {
    const messages = state.messages.filter((m) => m.text !== '').slice(-MAX_SAVED_MESSAGES);
    const target = store();
    if (!target) return;
    if (messages.length === 0) target.removeItem(STORAGE_KEY);
    else target.setItem(STORAGE_KEY, JSON.stringify({ v: 1, savedAt: now, messages }));
  } catch {
    // Storage full or blocked: the conversation just is not kept.
  }
}

/** The saved conversation, or `null` when there is none, it is a week old or it does not look like one. */
export function loadConversation(now: number = Date.now()): ChatState | null {
  try {
    const raw = store()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = SavedSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.messages.length === 0) return null;
    if (now - parsed.data.savedAt > SAVED_TTL_MS) return null;
    const messages = parsed.data.messages as ChatMessage[];
    const highest = Math.max(0, ...messages.map((m) => Number(/^m(\d+)$/.exec(m.id)?.[1] ?? 0)));
    return { messages, status: 'idle', tools: [], nextId: highest + 1 };
  } catch {
    return null;
  }
}

export function clearConversation(): void {
  try {
    store()?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
