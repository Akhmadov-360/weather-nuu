import { describe, expect, it } from 'vitest';
import type { ChatEvent } from '../model/events';
import { mockStream } from './mock-stream';

async function collect(message: string, lang: 'ru' | 'uz' | 'en', signal = new AbortController().signal): Promise<ChatEvent[]> {
  const out: ChatEvent[] = [];
  for await (const event of mockStream({ message, lang, signal, delayMs: 0 })) out.push(event);
  return out;
}

describe('mockStream', () => {
  it('plays a tool step, then the answer in the language of the question, then done', async () => {
    const events = await collect('Какая температура?', 'ru');
    expect(events[0]).toMatchObject({ type: 'tool_start', name: 'get_current' });
    expect(events[1]).toMatchObject({ type: 'tool_end', ok: true });
    expect(events.at(-1)!.type).toBe('done');
    const text = events.filter((e) => e.type === 'text').map((e) => (e as { delta: string }).delta).join('');
    expect(text).toMatch(/демонстрац/i);
  });

  it('answers in Uzbek and in English too', async () => {
    const uz = (await collect('Harorat qancha?', 'uz')).filter((e) => e.type === 'text').map((e) => (e as { delta: string }).delta).join('');
    const en = (await collect('What is the temperature?', 'en')).filter((e) => e.type === 'text').map((e) => (e as { delta: string }).delta).join('');
    expect(uz).toMatch(/demo/i);
    expect(en).toMatch(/demo/i);
  });

  it('stops when the request is cancelled', async () => {
    const controller = new AbortController();
    const events: ChatEvent[] = [];
    for await (const event of mockStream({ message: 'x', lang: 'en', signal: controller.signal, delayMs: 0 })) {
      events.push(event);
      controller.abort();
    }
    expect(events).toHaveLength(1);
  });
});
