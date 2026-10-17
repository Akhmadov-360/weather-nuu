import { describe, expect, it } from 'vitest';
import enAnalytics from './en/analytics.json';
import enCommon from './en/common.json';
import enMap from './en/map.json';
import ruAnalytics from './ru/analytics.json';
import ruCommon from './ru/common.json';
import ruMap from './ru/map.json';
import uzAnalytics from './uz/analytics.json';
import uzCommon from './uz/common.json';
import uzMap from './uz/map.json';

/**
 * Every zone writes its texts into its own namespace file (map.json, analytics.json) so that
 * several people do not edit common.json at once. Each namespace must exist in all three languages
 * with the same keys, and nothing may be empty.
 */
const NAMESPACES: Record<string, Record<'ru' | 'uz' | 'en', Record<string, string>>> = {
  common: { ru: ruCommon, uz: uzCommon, en: enCommon },
  map: { ru: ruMap, uz: uzMap, en: enMap },
  analytics: { ru: ruAnalytics, uz: uzAnalytics, en: enAnalytics },
};

describe.each(Object.entries(NAMESPACES))('namespace %s', (_name, langs) => {
  it('has identical key sets in ru, uz and en', () => {
    const keys = (l: Record<string, string>) => Object.keys(l).sort();
    expect(keys(langs.uz)).toEqual(keys(langs.ru));
    expect(keys(langs.en)).toEqual(keys(langs.ru));
  });

  it.each(['ru', 'uz', 'en'] as const)('%s has no empty text', (lang) => {
    for (const [key, value] of Object.entries(langs[lang])) expect(value.trim(), `${lang}:${key}`).not.toBe('');
  });
});

describe('section navigation texts', () => {
  it.each(['ru', 'uz', 'en'] as const)('%s names the map and the analytics sections in common.json', (lang) => {
    for (const key of ['nav_map', 'nav_analytics', 'title_map', 'title_analytics']) {
      expect(NAMESPACES.common![lang]![key], `${lang}:${key}`).toBeTruthy();
    }
  });
});
