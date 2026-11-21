// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/app/providers/i18n/i18n';
import type { ChatEvent } from '../model/events';
import type { StreamChatInput } from '../api/stream-chat';
import { AssistantChat } from './AssistantChat';

// The third-party visuals are replaced by plain stand-ins: these tests are about what the chat does.
vi.mock('@/components/ui/prompt-bar', () => ({
  default: function PromptBarStub({ onSend, onStop, busy, promptLabel, sendLabel, stopLabel, placeholder }: { onSend: (t: string, d: object) => void; onStop: () => void; busy: boolean; promptLabel: string; sendLabel: string; stopLabel: string; placeholder: string }) {
    const [value, setValue] = useState('');
    return (
      <div>
        <textarea aria-label={promptLabel} placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
        <button
          type="button"
          onClick={() => {
            if (busy) onStop();
            else {
              onSend(value, { attachments: [] });
              setValue('');
            }
          }}
        >
          {busy ? stopLabel : sendLabel}
        </button>
      </div>
    );
  },
}));
vi.mock('@/components/ui/lattice-loader', () => ({
  default: ({ label, status, doneLabel, errorLabel }: { label: string; status: string; doneLabel: string; errorLabel: string }) => (
    <div role="status" data-status={status}>
      {status === 'working' ? label : status === 'done' ? doneLabel : errorLabel}
    </div>
  ),
}));
vi.mock('@/components/animate-ui/backgrounds/stars', () => ({ StarsBackground: ({ children }: { children?: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/ui/blur-text', () => ({ default: ({ text }: { text: string }) => <p>{text}</p> }));
vi.mock('@/components/ui/shiny-text', () => ({ default: ({ text }: { text: string }) => <span>{text}</span> }));
let currentTheme: 'dark' | 'light' = 'dark';
vi.mock('@/shared/hooks/useTheme', () => ({ useTheme: () => ({ resolvedTheme: currentTheme }) }));

type Stream = (input: StreamChatInput) => AsyncGenerator<ChatEvent>;

function scripted(...turns: ChatEvent[][]): { stream: Stream; calls: StreamChatInput[] } {
  const calls: StreamChatInput[] = [];
  let turn = 0;
  const stream: Stream = async function* (input) {
    calls.push(input);
    for (const event of turns[turn++] ?? []) yield event;
  };
  return { stream, calls };
}

const done: ChatEvent = { type: 'done', inputTokens: 1, outputTokens: 1 };

function ask(text: string) {
  fireEvent.change(screen.getByLabelText('Вопрос помощнику'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
}

function mockMotionPreference(reduce: boolean, coarse = false) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: (reduce && query.includes('prefers-reduced-motion')) || (coarse && query.includes('pointer: coarse')),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => false,
  }));
}

// Most tests are not about the flight of the question, which would add a second copy of the text: motion is off.
beforeEach(() => {
  currentTheme = 'dark';
  mockMotionPreference(true);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the empty chat', () => {
  it('greets and offers four questions; a click asks one', async () => {
    const { stream, calls } = scripted([{ type: 'text', delta: 'ok' }, done]);
    render(<AssistantChat context="room" stream={stream} />);
    expect(screen.getByText('Спросите, что сейчас с воздухом.')).toBeTruthy();
    const suggestions = screen.getAllByRole('button').filter((b) => /\?$/.test(b.textContent ?? ''));
    expect(suggestions).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: 'Какая сейчас температура в аудитории?' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]!.message).toBe('Какая сейчас температура в аудитории?');
  });

  it('says which data the assistant works from, for the page it was opened on', () => {
    render(<AssistantChat context="room" stream={scripted().stream} />);
    expect(screen.getByText('Данные аудитории в реальном времени')).toBeTruthy();
    cleanup();
    render(<AssistantChat context="street" stream={scripted().stream} />);
    expect(screen.getByText('Данные уличных датчиков')).toBeTruthy();
  });

  it('asks in the field about the air where the visitor is: the room, or outside', () => {
    render(<AssistantChat context="room" stream={scripted().stream} />);
    expect(screen.getByLabelText('Вопрос помощнику').getAttribute('placeholder')).toBe('Спросите о воздухе в аудитории');
    cleanup();
    render(<AssistantChat context="street" stream={scripted().stream} />);
    expect(screen.getByLabelText('Вопрос помощнику').getAttribute('placeholder')).toBe('Спросите о воздухе на улице');
  });

  it('follows the theme of the page with its own colours', () => {
    currentTheme = 'light';
    const { container } = render(<AssistantChat context="room" stream={scripted().stream} />);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--ai-bg')).toBe('#F5F7FC');
    cleanup();
    currentTheme = 'dark';
    const dark = render(<AssistantChat context="room" stream={scripted().stream} />);
    expect((dark.container.firstElementChild as HTMLElement).style.getPropertyValue('--ai-bg')).toBe('#0B1020');
  });

  it('shows the privacy note and the not-medical-advice line', () => {
    render(<AssistantChat context="room" stream={scripted().stream} />);
    expect(screen.getByText('Вопросы отправляются в Gemini. Не пишите личные данные.')).toBeTruthy();
    expect(screen.getByText('Совет не является медицинской рекомендацией.')).toBeTruthy();
  });
});

describe('asking a question', () => {
  it('sends the page it was opened on and the language', async () => {
    const { stream, calls } = scripted([done]);
    render(<AssistantChat context="street" stream={stream} />);
    ask('Что на улице?');
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({ message: 'Что на улице?', context: 'street', lang: 'ru', history: [] });
  });

  it('cuts a question that is over the limit', async () => {
    const { stream, calls } = scripted([done]);
    render(<AssistantChat context="room" stream={stream} />);
    ask('а'.repeat(1500));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]!.message).toHaveLength(1000);
  });

  it('ignores an empty question', () => {
    const { stream, calls } = scripted();
    render(<AssistantChat context="room" stream={stream} />);
    ask('   ');
    expect(calls).toHaveLength(0);
  });

  it('shows the tool step while it works and when it is done, then the formatted answer', async () => {
    const { stream } = scripted([
      { type: 'tool_start', id: 't1', name: 'get_current' },
      { type: 'tool_end', id: 't1', name: 'get_current', ok: true },
      { type: 'text', delta: 'Сейчас **24,7 °C**' },
      done,
    ]);
    const { container } = render(<AssistantChat context="room" stream={stream} />);
    ask('Температура?');
    await waitFor(() => expect(container.querySelector('strong')?.textContent).toBe('24,7 °C'));
    expect(screen.getByText('Данные получены')).toBeTruthy();
    expect(screen.getByText('Температура?')).toBeTruthy();
  });

  it('shows a failed tool step in its own words', async () => {
    const { stream } = scripted([{ type: 'tool_start', id: 't1', name: 'get_period_summary' }, { type: 'tool_end', id: 't1', name: 'get_period_summary', ok: false }, done]);
    render(<AssistantChat context="room" stream={stream} />);
    ask('Что за год?');
    expect(await screen.findByText('Не удалось получить данные')).toBeTruthy();
  });

  it('sends the earlier questions and answers with the next question', async () => {
    const { stream, calls } = scripted([{ type: 'text', delta: 'Первый ответ' }, done], [done]);
    render(<AssistantChat context="room" stream={stream} />);
    ask('Первый?');
    await screen.findByText('Первый ответ');
    ask('Второй?');
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]!.history).toEqual([
      { role: 'user', content: 'Первый?' },
      { role: 'assistant', content: 'Первый ответ' },
    ]);
  });
});

describe('stopping and closing', () => {
  function hanging() {
    const signals: AbortSignal[] = [];
    const stream: Stream = async function* (input) {
      signals.push(input.signal);
      yield { type: 'text', delta: 'Сейчас' };
      await new Promise<void>((resolve) => input.signal.addEventListener('abort', () => resolve(), { once: true }));
    };
    return { stream, signals };
  }

  it('stops the answer with the stop button and keeps the words that arrived', async () => {
    const { stream, signals } = hanging();
    render(<AssistantChat context="room" stream={stream} />);
    ask('Вопрос');
    await screen.findByText('Сейчас');
    fireEvent.click(screen.getByRole('button', { name: 'Остановить' }));
    expect(signals[0]!.aborted).toBe(true);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Отправить' })).toBeTruthy());
    expect(screen.getByText('Сейчас')).toBeTruthy();
  });

  it('cancels the request when the chat is closed in the middle of an answer', async () => {
    const { stream, signals } = hanging();
    const { unmount } = render(<AssistantChat context="room" stream={stream} />);
    ask('Вопрос');
    await screen.findByText('Сейчас');
    unmount();
    expect(signals[0]!.aborted).toBe(true);
  });
});

describe('errors', () => {
  it('says in words that there were too many questions, and offers to try again', async () => {
    const { stream, calls } = scripted([{ type: 'error', code: 'rate_limited' }], [{ type: 'text', delta: 'Теперь ответ' }, done]);
    render(<AssistantChat context="room" stream={stream} />);
    ask('Вопрос');
    expect((await screen.findByRole('alert')).textContent).toContain('Слишком много вопросов. Подождите минуту.');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Повторить' })));
    await screen.findByText('Теперь ответ');
    expect(calls[1]!.message).toBe('Вопрос');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getAllByText('Вопрос')).toHaveLength(1);
  });

  it('keeps the text that arrived when an error comes in the middle, marks it cut off and offers to try again', async () => {
    const { stream } = scripted([{ type: 'text', delta: 'Сейчас 2' }, { type: 'error', code: 'upstream' }]);
    render(<AssistantChat context="room" stream={stream} />);
    ask('Вопрос');
    await screen.findByText('Ответ оборван');
    expect(screen.getByText('Сейчас 2')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Модель не ответила. Попробуйте ещё раз.');
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy();
  });

  it('does not send a cut-off answer with the next question', async () => {
    const { stream, calls } = scripted([{ type: 'text', delta: 'Сейчас 2' }, { type: 'error', code: 'upstream' }], [done]);
    render(<AssistantChat context="room" stream={stream} />);
    ask('Первый?');
    await screen.findByText('Ответ оборван');
    ask('Второй?');
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]!.history).toEqual([{ role: 'user', content: 'Первый?' }]);
  });

  it('tells the visitor when the device is offline', async () => {
    const { stream } = scripted([{ type: 'error', code: 'offline' }]);
    render(<AssistantChat context="room" stream={stream} />);
    ask('Вопрос');
    expect((await screen.findByRole('alert')).textContent).toContain('Нет связи с сервером.');
  });
});

describe('tool steps', () => {
  it('shows one line for the tools of an answer, not one for each', async () => {
    const { stream } = scripted([
      { type: 'tool_start', id: 'a', name: 'get_current' },
      { type: 'tool_start', id: 'b', name: 'get_current' },
      { type: 'tool_start', id: 'c', name: 'get_period_summary' },
      { type: 'tool_end', id: 'a', name: 'get_current', ok: true },
      { type: 'tool_end', id: 'b', name: 'get_current', ok: true },
      { type: 'tool_end', id: 'c', name: 'get_period_summary', ok: true },
      { type: 'text', delta: 'Готово' },
      done,
    ]);
    render(<AssistantChat context="room" stream={stream} />);
    ask('Сравни');
    await screen.findByText('Готово');
    expect(screen.getAllByText('Данные получены')).toHaveLength(1);
  });
});

describe('on a phone', () => {
  function stubKeyboard(height: number) {
    vi.stubGlobal('visualViewport', { height, addEventListener: () => undefined, removeEventListener: () => undefined });
    vi.stubGlobal('innerHeight', 800);
  }

  it('hides the small print while the keyboard is open, and shows it again when it is closed', () => {
    stubKeyboard(380);
    render(<AssistantChat context="room" stream={scripted().stream} />);
    expect(screen.queryByText('Совет не является медицинской рекомендацией.')).toBeNull();
    cleanup();
    stubKeyboard(800);
    render(<AssistantChat context="room" stream={scripted().stream} />);
    expect(screen.getByText('Совет не является медицинской рекомендацией.')).toBeTruthy();
  });

  it('closes the keyboard after a question is sent', async () => {
    mockMotionPreference(false, true);
    const { stream } = scripted([done]);
    render(<AssistantChat context="room" stream={stream} />);
    const field = screen.getByLabelText('Вопрос помощнику');
    field.focus();
    expect(document.activeElement).toBe(field);
    ask('Вопрос');
    await waitFor(() => expect(document.activeElement).not.toBe(field));
  });

  it('keeps the focus in the field on a computer', async () => {
    const { stream, calls } = scripted([done]);
    render(<AssistantChat context="room" stream={stream} />);
    const field = screen.getByLabelText('Вопрос помощнику');
    field.focus();
    ask('Вопрос');
    await waitFor(() => expect(calls).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.activeElement).toBe(field);
  });
});

describe('the question flying to the dialogue', () => {
  it('flies a copy of the question while the real bubble waits, then shows the bubble', async () => {
    mockMotionPreference(false);
    const { stream } = scripted([{ type: 'text', delta: 'Ответ' }, done]);
    const { container } = render(<AssistantChat context="room" stream={stream} />);
    ask('Летящий вопрос');
    await waitFor(() => expect(document.querySelector('[data-flying-message]')).not.toBeNull());
    const bubble = container.querySelector('[data-last-user]') as HTMLElement;
    expect(bubble.style.opacity).toBe('0');
    // However the animation ends, the real bubble is there for the visitor within a moment.
    await waitFor(() => expect(document.querySelector('[data-flying-message]')).toBeNull(), { timeout: 2500 });
    expect(bubble.style.opacity).toBe('');
  });

  it('does not fly when the visitor asks for less motion', async () => {
    const { stream } = scripted([done]);
    const { container } = render(<AssistantChat context="room" stream={stream} />);
    ask('Без полёта');
    await screen.findByText('Без полёта');
    expect(document.querySelector('[data-flying-message]')).toBeNull();
    expect((container.querySelector('[data-last-user]') as HTMLElement).style.opacity).toBe('');
  });

  it('flies from the suggestion that was pressed', async () => {
    mockMotionPreference(false);
    const { stream } = scripted([done]);
    render(<AssistantChat context="room" stream={stream} />);
    fireEvent.click(screen.getByRole('button', { name: 'Какой сейчас уровень пыли PM2.5?' }));
    await waitFor(() => expect(document.querySelector('[data-flying-message]')).not.toBeNull());
  });
});
