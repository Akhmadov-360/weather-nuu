import { describe, expect, it } from 'vitest';
import { applyEvent, finishTurn, initialState, prepareRetry, startTurn, type ChatState } from './conversation';
import { trimHistory } from './history';
import { HISTORY_MAX_CHARS, HISTORY_MAX_MESSAGES } from './events';

function run(state: ChatState, ...events: Parameters<typeof applyEvent>[1][]): ChatState {
  return events.reduce(applyEvent, state);
}

const lastAssistant = (s: ChatState) => [...s.messages].reverse().find((m) => m.role === 'assistant');

describe('a turn', () => {
  it('adds the question and an empty answer and starts streaming', () => {
    const s = startTurn(initialState(), 'Какая температура?');
    expect(s.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(s.messages[0]!.text).toBe('Какая температура?');
    expect(s.status).toBe('streaming');
  });

  it('joins text pieces into one answer and ends idle on done', () => {
    const s = run(startTurn(initialState(), 'q'), { type: 'text', delta: 'Сей' }, { type: 'text', delta: 'час 24' }, { type: 'done', inputTokens: 1, outputTokens: 1 });
    expect(lastAssistant(s)!.text).toBe('Сейчас 24');
    expect(s.status).toBe('idle');
  });

  it('tracks a tool step from working to done, and to failed', () => {
    let s = run(startTurn(initialState(), 'q'), { type: 'tool_start', id: 't1', name: 'get_current' });
    expect(s.tools).toEqual([{ id: 't1', name: 'get_current', status: 'working' }]);
    s = applyEvent(s, { type: 'tool_end', id: 't1', name: 'get_current', ok: true });
    expect(s.tools[0]!.status).toBe('done');
    s = run(s, { type: 'tool_start', id: 't2', name: 'get_period_summary' }, { type: 'tool_end', id: 't2', name: 'get_period_summary', ok: false });
    expect(s.tools[1]!.status).toBe('error');
  });

  it('does not leave a tool spinning when the answer is done', () => {
    const s = run(startTurn(initialState(), 'q'), { type: 'tool_start', id: 't1', name: 'get_current' }, { type: 'done', inputTokens: 0, outputTokens: 0 });
    expect(s.tools[0]!.status).toBe('done');
  });
});

describe('an error', () => {
  it('before any text removes the empty answer and keeps the code', () => {
    const s = run(startTurn(initialState(), 'q'), { type: 'error', code: 'rate_limited' });
    expect(s.status).toBe('error');
    expect(s.error).toBe('rate_limited');
    expect(s.messages.map((m) => m.role)).toEqual(['user']);
  });

  it('in the middle of an answer keeps the text and marks it as cut off', () => {
    const s = run(startTurn(initialState(), 'q'), { type: 'text', delta: 'Сейчас 2' }, { type: 'error', code: 'upstream' });
    expect(lastAssistant(s)).toMatchObject({ text: 'Сейчас 2', interrupted: true });
    expect(s.status).toBe('error');
    expect(s.error).toBe('upstream');
  });

  it('stops a tool that was still working', () => {
    const s = run(startTurn(initialState(), 'q'), { type: 'tool_start', id: 't1', name: 'get_current' }, { type: 'error', code: 'upstream' });
    expect(s.tools[0]!.status).toBe('error');
  });
});

describe('retry', () => {
  it('takes the cut-off answer and its question out and gives the question back', () => {
    let s = run(startTurn(initialState(), 'Первый'), { type: 'text', delta: 'Ответ' }, { type: 'done', inputTokens: 0, outputTokens: 0 });
    s = run(startTurn(s, 'Второй'), { type: 'text', delta: 'Оборван' }, { type: 'error', code: 'upstream' });
    const { state, message } = prepareRetry(s);
    expect(message).toBe('Второй');
    expect(state.messages.map((m) => m.text)).toEqual(['Первый', 'Ответ']);
    expect(state.status).toBe('idle');
    expect(state.error).toBeUndefined();
  });

  it('gives nothing back when there is no question', () => {
    expect(prepareRetry(initialState()).message).toBeNull();
  });
});

describe('trimHistory', () => {
  const say = (role: 'user' | 'assistant', text: string, extra = {}) => ({ id: Math.random().toString(), role, text, ...extra });

  it('sends only what was said, in order', () => {
    expect(trimHistory([say('user', 'a'), say('assistant', 'b')])).toEqual([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
    ]);
  });

  it('leaves out an answer that was cut off and an empty one', () => {
    const history = trimHistory([say('user', 'a'), say('assistant', 'половина', { interrupted: true }), say('assistant', '')]);
    expect(history).toEqual([{ role: 'user', content: 'a' }]);
  });

  it('keeps only the newest messages when there are too many', () => {
    const many = Array.from({ length: HISTORY_MAX_MESSAGES + 5 }, (_, i) => say(i % 2 ? 'assistant' : 'user', `m${i}`));
    const out = trimHistory(many);
    expect(out).toHaveLength(HISTORY_MAX_MESSAGES);
    expect(out.at(-1)!.content).toBe(`m${HISTORY_MAX_MESSAGES + 4}`);
  });

  it('drops the oldest messages until the total fits the character limit', () => {
    const big = 'a'.repeat(HISTORY_MAX_CHARS / 2);
    const out = trimHistory([say('user', big), say('assistant', big), say('user', 'новый')]);
    expect(out.reduce((n, m) => n + m.content.length, 0)).toBeLessThanOrEqual(HISTORY_MAX_CHARS);
    expect(out.at(-1)!.content).toBe('новый');
  });

  it('drops a single message that is over the limit on its own', () => {
    expect(trimHistory([say('assistant', 'a'.repeat(HISTORY_MAX_CHARS + 1)), say('user', 'ok')])).toEqual([{ role: 'user', content: 'ok' }]);
  });
});

describe('finishTurn', () => {
  it('ends a turn that stopped without a final event (the visitor pressed stop), keeping the text', () => {
    const s = finishTurn(run(startTurn(initialState(), 'q'), { type: 'text', delta: 'Сейчас' }, { type: 'tool_start', id: 't1', name: 'get_current' }));
    expect(s.status).toBe('idle');
    expect(lastAssistant(s)!.text).toBe('Сейчас');
    expect(s.tools[0]!.status).toBe('done');
  });

  it('drops the empty answer when nothing had arrived', () => {
    const s = finishTurn(startTurn(initialState(), 'q'));
    expect(s.messages.map((m) => m.role)).toEqual(['user']);
    expect(s.status).toBe('idle');
  });

  it('leaves a turn that already ended as it is, including an error', () => {
    const failed = run(startTurn(initialState(), 'q'), { type: 'error', code: 'upstream' });
    expect(finishTurn(failed)).toBe(failed);
    const done = run(startTurn(initialState(), 'q'), { type: 'text', delta: 'a' }, { type: 'done', inputTokens: 0, outputTokens: 0 });
    expect(finishTurn(done)).toBe(done);
  });
});

describe('the tool line stays with its answer', () => {
  it('is written onto the answer while the tools work and after they are done', () => {
    let s = run(startTurn(initialState(), 'q'), { type: 'tool_start', id: 't1', name: 'get_current' });
    expect(lastAssistant(s)!.tool).toEqual({ name: 'get_current', status: 'working' });
    s = run(s, { type: 'tool_end', id: 't1', name: 'get_current', ok: true }, { type: 'text', delta: 'Ответ' }, { type: 'done', inputTokens: 0, outputTokens: 0 });
    expect(lastAssistant(s)!.tool).toEqual({ name: 'get_current', status: 'done' });
  });

  it('is not lost when the next question is answered without tools', () => {
    let s = run(
      startTurn(initialState(), 'Первый'),
      { type: 'tool_start', id: 't1', name: 'get_current' },
      { type: 'tool_end', id: 't1', name: 'get_current', ok: true },
      { type: 'text', delta: 'Ответ 1' },
      { type: 'done', inputTokens: 0, outputTokens: 0 },
    );
    s = run(startTurn(s, 'Второй'), { type: 'text', delta: 'Ответ 2 из общих знаний' }, { type: 'done', inputTokens: 0, outputTokens: 0 });
    const answers = s.messages.filter((m) => m.role === 'assistant');
    expect(answers[0]!.tool).toEqual({ name: 'get_current', status: 'done' });
    expect(answers[1]!.tool).toBeUndefined();
  });

  it('is settled when the turn ends by an error or by the stop button', () => {
    const failed = run(startTurn(initialState(), 'q'), { type: 'tool_start', id: 't1', name: 'get_current' }, { type: 'error', code: 'upstream' });
    expect(failed.messages.at(-1)!.tool).toBeUndefined();
    const stopped = finishTurn(run(startTurn(initialState(), 'q'), { type: 'text', delta: 'a' }, { type: 'tool_start', id: 't1', name: 'get_current' }));
    expect(lastAssistant(stopped)!.tool?.status).toBe('done');
  });
});
