import type { AssistantErrorCode, AssistantEvent } from './events';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** The answer stopped in the middle (an error came after some text). */
  interrupted?: boolean;
};

export type ToolStep = { id: string; name: string; status: 'working' | 'done' | 'error' };

export type ChatState = {
  messages: ChatMessage[];
  status: 'idle' | 'streaming' | 'error';
  error?: AssistantErrorCode;
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

export function applyEvent(state: ChatState, event: AssistantEvent): ChatState {
  switch (event.type) {
    case 'text':
      return { ...state, messages: withLastAnswer(state, (m) => ({ ...m, text: m.text + event.delta })) };
    case 'tool_start':
      return { ...state, tools: [...state.tools, { id: event.id, name: event.name, status: 'working' }] };
    case 'tool_end':
      return {
        ...state,
        tools: state.tools.map((t) => (t.id === event.id ? { ...t, status: event.ok ? 'done' : 'error' } : t)),
      };
    case 'citations':
      return state;
    case 'done':
      return { ...state, status: 'idle', tools: settleTools(state.tools, 'done') };
    case 'error': {
      const last = state.messages.at(-1);
      const hasText = last?.role === 'assistant' && last.text.length > 0;
      const messages = hasText
        ? withLastAnswer(state, (m) => ({ ...m, interrupted: true }))
        : last?.role === 'assistant'
          ? state.messages.slice(0, -1)
          : state.messages;
      return { ...state, messages, status: 'error', error: event.code, tools: settleTools(state.tools, 'error') };
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
