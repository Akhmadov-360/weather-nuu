import type { AssistantLang, ChatEvent } from '../model/events';

/** The text of the scripted answer. Honest about being a demo: the real model is not behind it. */
const ANSWERS: Record<AssistantLang, string[]> = {
  ru: ['Это демонстрационный сценарий: ', 'настоящая модель пока не подключена. ', 'Так выглядит ответ: ', 'сейчас в аудитории **24,7 °C**, ', 'влажность 38 %.'],
  uz: ["Bu demo ssenariy: ", "haqiqiy model hali ulanmagan. ", "Javob shunday ko'rinadi: ", "hozir auditoriyada **24,7 °C**, ", "namlik 38 %."],
  en: ['This is a demo scenario: ', 'the real model is not connected yet. ', 'This is what an answer looks like: ', 'the room is **24.7 °C** now, ', 'humidity 38 %.'],
};

function pause(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0 || signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

/**
 * A scripted answer for development and for showing the interface without a server or a key
 * (`VITE_ASSISTANT_MOCK=1`): one tool step, then the text in pieces, then done.
 */
export async function* mockStream(input: { message: string; lang: AssistantLang; signal: AbortSignal; delayMs?: number }): AsyncGenerator<ChatEvent> {
  const delay = input.delayMs ?? 60;
  const { signal } = input;

  yield { type: 'tool_start', id: 'mock-1', name: 'get_current' };
  await pause(delay * 8, signal);
  if (signal.aborted) return;
  yield { type: 'tool_end', id: 'mock-1', name: 'get_current', ok: true };

  for (const delta of ANSWERS[input.lang]) {
    await pause(delay, signal);
    if (signal.aborted) return;
    yield { type: 'text', delta };
  }
  if (signal.aborted) return;
  yield { type: 'done', inputTokens: 0, outputTokens: 0 };
}
