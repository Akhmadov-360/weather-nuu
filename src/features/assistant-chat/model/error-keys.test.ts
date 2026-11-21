import { describe, expect, it } from 'vitest';
import en from '@/assets/locales/en/assistant.json';
import ru from '@/assets/locales/ru/assistant.json';
import uz from '@/assets/locales/uz/assistant.json';
import { ASSISTANT_ERROR_CODES } from './events';
import { ERROR_KEYS, TOOL_KEYS, toolKey } from './error-keys';

const packs = { ru, uz, en } as Record<'ru' | 'uz' | 'en', Record<string, string>>;

describe('error codes', () => {
  it.each(['ru', 'uz', 'en'] as const)('%s has a text for every error code', (lang) => {
    for (const code of ASSISTANT_ERROR_CODES) expect(packs[lang][ERROR_KEYS[code]], `${lang}:${code}`).toBeTruthy();
  });

  it('has a text for the offline case in every language', () => {
    for (const lang of ['ru', 'uz', 'en'] as const) expect(packs[lang].assistant_err_offline, lang).toBeTruthy();
  });
});

describe('tool names', () => {
  it.each(['ru', 'uz', 'en'] as const)('%s has a text for every known tool and for an unknown one', (lang) => {
    for (const key of [...Object.values(TOOL_KEYS), 'assistant_tool_unknown']) expect(packs[lang][key], `${lang}:${key}`).toBeTruthy();
  });

  it('falls back to the generic text for a tool the interface does not know', () => {
    expect(toolKey('get_current')).toBe('assistant_tool_get_current');
    expect(toolKey('something_new')).toBe('assistant_tool_unknown');
  });
});

describe('texts are not copies of the Russian ones', () => {
  it.each(['uz', 'en'] as const)('%s differs from ru for every key', (lang) => {
    for (const [key, value] of Object.entries(packs[lang])) expect(value, `${lang}:${key}`).not.toBe(packs.ru[key]);
  });
});
