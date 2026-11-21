import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatEvent } from '../model/events';
import { streamChat, type StreamChatInput } from './stream-chat';

const encoder = new TextEncoder();

const frame = (event: object) => `event: ${(event as { type: string }).type}\ndata: ${JSON.stringify(event)}\n\n`;

/** A response whose body arrives in the given pieces. */
function sse(pieces: string[], status = 200): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const piece of pieces) controller.enqueue(encoder.encode(piece));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { 'content-type': 'text/event-stream' } });
}

function input(over: Partial<StreamChatInput> = {}): StreamChatInput {
  return { message: 'Какая температура?', history: [], lang: 'ru', context: 'room', signal: new AbortController().signal, baseUrl: 'https://api.test', ...over };
}

async function collect(i: StreamChatInput): Promise<ChatEvent[]> {
  const out: ChatEvent[] = [];
  for await (const event of streamChat(i)) out.push(event);
  return out;
}

afterEach(() => vi.unstubAllGlobals());

describe('streamChat', () => {
  it('turns the pieces of the body into events', async () => {
    const a = frame({ type: 'tool_start', id: 't1', name: 'get_current' });
    const b = frame({ type: 'text', delta: 'Сейчас 24 °C' });
    vi.stubGlobal('fetch', vi.fn(async () => sse([a.slice(0, 10), a.slice(10) + b.slice(0, 20), b.slice(20), frame({ type: 'done', inputTokens: 1, outputTokens: 1 })])));
    const events = await collect(input());
    expect(events.map((e) => e.type)).toEqual(['tool_start', 'text', 'done']);
  });

  it('posts the question, the history, the language and the page as JSON', async () => {
    const fetchMock = vi.fn(async () => sse([frame({ type: 'done', inputTokens: 0, outputTokens: 0 })]));
    vi.stubGlobal('fetch', fetchMock);
    const history = [{ role: 'user' as const, content: 'Привет' }];
    await collect(input({ history, lang: 'uz', context: 'street' }));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/v1/assistant/chat');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
    expect(new Headers(init.headers).get('accept')).toBe('text/event-stream');
    expect(JSON.parse(init.body as string)).toEqual({ message: 'Какая температура?', history, lang: 'uz', context: 'street' });
  });

  it.each([
    [429, 'rate_limited'],
    [503, 'disabled'],
    [400, 'bad_request'],
    [500, 'internal'],
    [502, 'upstream'],
  ])('turns the HTTP status %i into the error code %s', async (status, code) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status })));
    expect(await collect(input())).toEqual([{ type: 'error', code }]);
  });

  it('says offline when the request never reaches the server', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect(await collect(input())).toEqual([{ type: 'error', code: 'offline' }]);
  });

  it('reports a body that breaks in the middle as an upstream error, after the events that did arrive', async () => {
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      // The first read gets an event, the second one fails (error() would drop a queued piece).
      pull(controller) {
        if (pulls++ === 0) controller.enqueue(encoder.encode(frame({ type: 'text', delta: 'Сейчас' })));
        else controller.error(new TypeError('network error'));
      },
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status: 200 })));
    const events = await collect(input());
    expect(events.map((e) => e.type)).toEqual(['text', 'error']);
    expect(events.at(-1)).toEqual({ type: 'error', code: 'upstream' });
  });

  it('ends quietly and cancels the body when the panel is closed', async () => {
    const controller = new AbortController();
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(encoder.encode(frame({ type: 'text', delta: 'a' })));
      },
      cancel() {
        cancelled = true;
      },
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status: 200 })));
    const events: ChatEvent[] = [];
    for await (const event of streamChat(input({ signal: controller.signal }))) {
      events.push(event);
      controller.abort();
    }
    expect(events).toEqual([{ type: 'text', delta: 'a' }]);
    expect(cancelled).toBe(true);
  });

  it('ends quietly when the request is aborted before the answer starts', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('Aborted', 'AbortError'); }));
    controller.abort();
    expect(await collect(input({ signal: controller.signal }))).toEqual([]);
  });

  it('reports an answer that has no body as an upstream error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 })));
    expect(await collect(input())).toEqual([{ type: 'error', code: 'upstream' }]);
  });
});
