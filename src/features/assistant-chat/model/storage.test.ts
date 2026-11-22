// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyEvent, initialState, startTurn, type ChatState } from './conversation';
import { clearConversation, loadConversation, MAX_SAVED_MESSAGES, SAVED_TTL_MS, saveConversation, STORAGE_KEY } from './storage';

const NOW = Date.parse('2026-11-21T12:00:00Z');

function talked(...pairs: [string, string][]): ChatState {
  let s = initialState();
  for (const [q, a] of pairs) {
    s = startTurn(s, q);
    s = applyEvent(s, { type: 'text', delta: a });
    s = applyEvent(s, { type: 'done', inputTokens: 0, outputTokens: 0 });
  }
  return s;
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('saving and loading the conversation', () => {
  it('brings back what was said, with the tool line of each answer', () => {
    let s = startTurn(initialState(), 'Температура?');
    s = [
      { type: 'tool_start', id: 't1', name: 'get_current' },
      { type: 'tool_end', id: 't1', name: 'get_current', ok: true },
      { type: 'text', delta: 'Сейчас 24 °C' },
      { type: 'done', inputTokens: 0, outputTokens: 0 },
    ].reduce((acc, e) => applyEvent(acc, e as Parameters<typeof applyEvent>[1]), s);
    saveConversation(s, NOW);
    const back = loadConversation(NOW + 1000)!;
    expect(back.messages.map((m) => m.text)).toEqual(['Температура?', 'Сейчас 24 °C']);
    expect(back.messages[1]!.tool).toEqual({ name: 'get_current', status: 'done' });
    expect(back.status).toBe('idle');
    expect(back.tools).toEqual([]);
  });

  it('goes on numbering after the saved messages, so a new question never repeats an id', () => {
    saveConversation(talked(['a', 'b'], ['c', 'd']), NOW);
    const back = loadConversation(NOW)!;
    const next = startTurn(back, 'e');
    const ids = next.messages.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps only the newest messages', () => {
    const pairs: [string, string][] = Array.from({ length: 15 }, (_, i) => [`q${i}`, `a${i}`]);
    saveConversation(talked(...pairs), NOW);
    const back = loadConversation(NOW)!;
    expect(back.messages).toHaveLength(MAX_SAVED_MESSAGES);
    expect(back.messages.at(-1)!.text).toBe('a14');
  });

  it('forgets a conversation after a week', () => {
    saveConversation(talked(['a', 'b']), NOW);
    expect(loadConversation(NOW + SAVED_TTL_MS - 1000)).not.toBeNull();
    expect(loadConversation(NOW + SAVED_TTL_MS + 1000)).toBeNull();
  });

  it('does not save an answer that is still arriving', () => {
    saveConversation(talked(['a', 'b']), NOW);
    const live = startTurn(talked(['a', 'b']), 'c');
    saveConversation(live, NOW + 5);
    expect(loadConversation(NOW + 10)!.messages.map((m) => m.text)).toEqual(['a', 'b']);
  });

  it('removes the saved conversation when there is nothing to keep', () => {
    saveConversation(talked(['a', 'b']), NOW);
    saveConversation(initialState(), NOW);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clears on request', () => {
    saveConversation(talked(['a', 'b']), NOW);
    clearConversation();
    expect(loadConversation(NOW)).toBeNull();
  });
});

describe('what comes back from the browser is not trusted', () => {
  it.each([
    ['broken JSON', '{not json'],
    ['a different version', JSON.stringify({ v: 2, savedAt: NOW, messages: [] })],
    ['messages of the wrong shape', JSON.stringify({ v: 1, savedAt: NOW, messages: [{ role: 'tool', text: 'x' }] })],
    ['an answer that is not text', JSON.stringify({ v: 1, savedAt: NOW, messages: [{ id: 'm1', role: 'user', text: 5 }] })],
  ])('ignores %s', (_name, raw) => {
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadConversation(NOW)).toBeNull();
  });

  it('drops a saved message that is too long, rather than trusting its size', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, savedAt: NOW, messages: [{ id: 'm1', role: 'user', text: 'a'.repeat(50_000) }] }));
    expect(loadConversation(NOW)).toBeNull();
  });
});

describe('when the browser does not let the page keep notes (private mode)', () => {
  it('does not break: it just remembers nothing', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => saveConversation(talked(['a', 'b']), NOW)).not.toThrow();
    expect(loadConversation(NOW)).toBeNull();
    expect(() => clearConversation()).not.toThrow();
  });
});

describe('saved sources', () => {
  it('keeps the sources of an answer with the conversation', () => {
    const state: ChatState = {
      messages: [
        { id: 'm1', role: 'user', text: 'q' },
        { id: 'm2', role: 'assistant', text: 'a', sources: [{ id: 'who#1', title: 'T', source: 'WHO 2021', url: 'https://www.who.int/x' }] },
      ],
      status: 'idle',
      tools: [],
      nextId: 3,
    };
    saveConversation(state, 1000);
    expect(loadConversation(1000)?.messages[1]?.sources).toEqual([{ id: 'who#1', title: 'T', source: 'WHO 2021', url: 'https://www.who.int/x' }]);
  });
});
