import type { ChatErrorCode, ChatEvent, Citation } from './events';
import { summarizeTools } from './tool-summary';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** The answer stopped in the middle (an error came after some text). */
  interrupted?: boolean;
  /** What the tools did for this answer, as one line. It stays with the answer after the turn is over. */
  tool?: { name: string; status: 'working' | 'done' | 'error' };
  /** The documents the answer is based on (from the knowledge base), one entry for each. */
  sources?: Citation[];
};

export type ToolStep = { id: string; name: string; status: 'working' | 'done' | 'error' };

export type ChatState = {
  messages: ChatMessage[];
  status: 'idle' | 'streaming' | 'error';
  error?: ChatErrorCode;
  /** The tools of the turn in progress (or the last turn). */
  tools: ToolStep[];
  nextId: number;
};

export function initialState(): ChatState {
  return { messages: [], status: 'idle', tools: [], nextId: 1 };
}

/** Adds the question and an empty answer that the stream will fill. */
export function startTurn(state: ChatState, text: string): ChatState {
  const id = state.nextId;
  return {
    messages: [
      ...state.messages,
      { id: `m${id}`, role: 'user', text },
      { id: `m${id + 1}`, role: 'assistant', text: '' },
    ],
    status: 'streaming',
    error: undefined,
    tools: [],
    nextId: id + 2,
  };
}

function withLastAnswer(state: ChatState, change: (m: ChatMessage) => ChatMessage): ChatMessage[] {
  const last = state.messages.at(-1);
  if (!last || last.role !== 'assistant') return state.messages;
  return [...state.messages.slice(0, -1), change(last)];
}

function settleTools(tools: ToolStep[], status: 'done' | 'error'): ToolStep[] {
  return tools.map((t) => (t.status === 'working' ? { ...t, status } : t));
}

/** New tool steps for the turn, and the one-line summary of them written onto the answer being made. */
function withTools(state: ChatState, tools: ToolStep[]): ChatState {
  const tool = summarizeTools(tools) ?? undefined;
  return { ...state, tools, messages: withLastAnswer(state, (m) => ({ ...m, tool })) };
}

/** Several fragments of one document are one source: the visitor needs the document, not the paragraph. */
export function uniqueSources(items: readonly Citation[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const item of items) {
    if (seen.has(item.source)) continue;
    seen.add(item.source);
    out.push(item);
  }
  return out;
}

export function applyEvent(state: ChatState, event: ChatEvent): ChatState {
  switch (event.type) {
    case 'text':
      return { ...state, messages: withLastAnswer(state, (m) => ({ ...m, text: m.text + event.delta })) };
    case 'tool_start':
      return withTools(state, [...state.tools, { id: event.id, name: event.name, status: 'working' }]);
    case 'tool_end':
      return withTools(
        state,
        state.tools.map((t) => (t.id === event.id ? { ...t, status: event.ok ? 'done' : 'error' } : t)),
      );
    case 'citations':
      return { ...state, messages: withLastAnswer(state, (m) => ({ ...m, sources: uniqueSources(event.items) })) };
    case 'done':
      return { ...withTools(state, settleTools(state.tools, 'done')), status: 'idle' };
    case 'error': {
      const last = state.messages.at(-1);
      const hasText = last?.role === 'assistant' && last.text.length > 0;
      const messages = hasText
        ? withLastAnswer(state, (m) => ({ ...m, interrupted: true }))
        : last?.role === 'assistant'
          ? state.messages.slice(0, -1)
          : state.messages;
      return { ...withTools({ ...state, messages }, settleTools(state.tools, 'error')), status: 'error', error: event.code };
    }
  }
}

/**
 * "Try again": takes the last question and its (cut-off or missing) answer out and gives the question
 * back, so the caller can ask it again with `startTurn`.
 */
export function prepareRetry(state: ChatState): { state: ChatState; message: string | null } {
  const messages = [...state.messages];
  if (messages.at(-1)?.role === 'assistant') messages.pop();
  const question = messages.at(-1);
  if (!question || question.role !== 'user') return { state, message: null };
  messages.pop();
  return { state: { ...state, messages, status: 'idle', error: undefined, tools: [] }, message: question.text };
}

/**
 * The stream ended without a final event (the visitor pressed stop, or the connection closed quietly):
 * the turn is over. The text that arrived stays; an answer that never got a word is removed.
 */
export function finishTurn(state: ChatState): ChatState {
  if (state.status !== 'streaming') return state;
  const last = state.messages.at(-1);
  const messages = last?.role === 'assistant' && last.text === '' ? state.messages.slice(0, -1) : state.messages;
  return { ...withTools({ ...state, messages }, settleTools(state.tools, 'done')), status: 'idle' };
}
