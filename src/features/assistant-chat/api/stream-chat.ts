import { ENV } from '@/shared/config/env';
import type { AssistantContext, AssistantLang, ChatErrorCode, ChatEvent, HistoryMessage } from '../model/events';
import { createSseParser } from '../model/sse';
import { mockStream } from './mock-stream';

export type StreamChatInput = {
  message: string;
  history: HistoryMessage[];
  lang: AssistantLang;
  context: AssistantContext;
  signal: AbortSignal;
  /** Defaults to the new backend's address; tests pass their own. */
  baseUrl?: string | null;
  /** Defaults to `VITE_ASSISTANT_MOCK`. */
  mock?: boolean;
};

function errorForStatus(status: number): ChatErrorCode {
  if (status === 429) return 'rate_limited';
  if (status === 503) return 'disabled';
  if (status === 400 || status === 422) return 'bad_request';
  if (status === 500) return 'internal';
  return 'upstream';
}

/**
 * Asks the assistant and yields its answer event by event. It never throws: every failure is an `error`
 * event (a status code from the server, `offline` when the request never got there, `upstream` when the
 * answer broke off). Aborting `signal` (the panel was closed) ends it quietly and closes the connection.
 */
export async function* streamChat(input: StreamChatInput): AsyncGenerator<ChatEvent> {
  if (input.mock ?? ENV.assistantMock) {
    yield* mockStream({ message: input.message, lang: input.lang, signal: input.signal });
    return;
  }
  const baseUrl = input.baseUrl === undefined ? ENV.exportBaseUrl : input.baseUrl;
  if (!baseUrl) {
    yield { type: 'error', code: 'disabled' };
    return;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body: JSON.stringify({ message: input.message, history: input.history, lang: input.lang, context: input.context }),
      signal: input.signal,
    });
  } catch {
    if (!input.signal.aborted) yield { type: 'error', code: 'offline' };
    return;
  }

  if (!response.ok) {
    yield { type: 'error', code: errorForStatus(response.status) };
    return;
  }
  if (!response.body) {
    yield { type: 'error', code: 'upstream' };
    return;
  }

  const reader = response.body.getReader();
  // A read that is waiting for the next piece ends as soon as the panel is closed.
  const stop = () => void reader.cancel().catch(() => undefined);
  input.signal.addEventListener('abort', stop, { once: true });
  const parser = createSseParser();

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (input.signal.aborted) return;
      if (done) break;
      yield* parser.push(value);
    }
    yield* parser.end();
  } catch {
    if (!input.signal.aborted) yield { type: 'error', code: 'upstream' };
  } finally {
    input.signal.removeEventListener('abort', stop);
    void reader.cancel().catch(() => undefined);
  }
}
