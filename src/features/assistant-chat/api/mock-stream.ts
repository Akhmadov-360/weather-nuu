import type { AssistantLang, ChatEvent } from '../model/events';

/** The text of the scripted answer. Honest about being a demo: the real model is not behind it. */
const ANSWERS: Record<AssistantLang, string[]> = {
  ru: ['Это демонстрационный сценарий: ', 'настоящая модель пока не подключена. ', 'Так выглядит ответ: ', 'сейчас в аудитории **24,7 °C**, ', 'влажность 38 %.'],
  uz: ["Bu demo ssenariy: ", "haqiqiy model hali ulanmagan. ", "Javob shunday ko'rinadi: ", "hozir auditoriyada **24,7 °C**, ", "namlik 38 %."],
  en: ['This is a demo scenario: ', 'the real model is not connected yet. ', 'This is what an answer looks like: ', 'the room is **24.7 °C** now, ', 'humidity 38 %.'],
};

const NORMS: Record<AssistantLang, string[]> = {
  ru: ['Демонстрация ответа из базы знаний: ', 'по рекомендациям ВОЗ 2021 ', 'среднесуточный уровень PM2.5 ', '**15 мкг/м³**.'],
  uz: ["Bilimlar bazasidan demo javob: ", "JSST 2021 tavsiyasiga ko'ra ", "PM2.5 sutkalik darajasi ", '**15 mkg/m³**.'],
  en: ['A demo answer from the knowledge base: ', 'the WHO 2021 guideline ', 'for 24-hour PM2.5 is ', '**15 µg/m³**.'],
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

  // A question about norms shows the knowledge-base path: a search, an answer and its sources.
  const about = /норм|norm|me.yor/i.test(input.message) || /ВОЗ|WHO|JSST/.test(input.message);
  const tool = about ? 'search_knowledge' : 'get_current';
  yield { type: 'tool_start', id: 'mock-1', name: tool };
  await pause(delay * 8, signal);
  if (signal.aborted) return;
  yield { type: 'tool_end', id: 'mock-1', name: tool, ok: true };

  for (const delta of about ? NORMS[input.lang] : ANSWERS[input.lang]) {
    await pause(delay, signal);
    if (signal.aborted) return;
    yield { type: 'text', delta };
  }
  if (signal.aborted) return;
  if (about) {
    yield {
      type: 'citations',
      items: [
        { id: 'who-2021.en#1', title: 'WHO air quality guideline levels 2021 / Particulate matter', source: 'WHO global air quality guidelines 2021', url: 'https://www.who.int/publications/i/item/9789240034228' },
        { id: 'station.en#1', title: 'The NUUz air station', source: 'NUUz station' },
      ],
    };
  }
  yield { type: 'done', inputTokens: 0, outputTokens: 0 };
}
