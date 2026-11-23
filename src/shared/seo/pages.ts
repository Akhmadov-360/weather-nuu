import { SECTIONS, type SectionId } from '../config/sections';
import data from './seo.json';

export type Lang = 'ru' | 'uz' | 'en';
export const LANGS: readonly Lang[] = ['ru', 'uz', 'en'];
/** The language of the pages as they are served (the visitor can change it in the browser). */
export const DEFAULT_LANG: Lang = 'ru';

type Texts = Record<Lang, string>;
export type PageSeo = { id: SectionId; path: string; title: Texts; description: Texts; heading: Texts; indexable: boolean };

export const SITE_URL: string = data.siteUrl;
export const SITE_NAME: string = data.siteName;
export const IMAGE = data.image as { path: string; width: number; height: number; alt: Texts };
export const NOT_FOUND = data.notFound as { title: Texts; description: Texts };
export const ABOUT = data.about as Texts;

/**
 * Every page of the app with its texts in the three languages. A page is for the search engines only when its section is
 * on in the navigation (`enabled` in sections.ts): a placeholder that waits for its owner stays out of the sitemap and is
 * marked `noindex`, and turning the section on is what puts it into the index.
 */
export const PAGES: readonly PageSeo[] = (Object.entries(data.pages) as [SectionId, (typeof data.pages)['room']][]).map(([id, page]) => ({
  id,
  path: page.path,
  title: page.title as Texts,
  description: page.description as Texts,
  heading: page.heading as Texts,
  indexable: SECTIONS.find((s) => s.id === id)?.enabled ?? false,
}));

/** The page of an address of the app, or `undefined` for an address that is not a page (the 404). */
export function pageForPath(pathname: string): PageSeo | undefined {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PAGES.find((p) => p.path === clean);
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/** The language code of the interface (`ru`, `uz-Latn`, `en-US`) as one of ours. */
export function normalizeLang(code: string | undefined): Lang {
  const short = (code ?? '').slice(0, 2).toLowerCase();
  return (LANGS as readonly string[]).includes(short) ? (short as Lang) : DEFAULT_LANG;
}
