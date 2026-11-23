import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NOT_FOUND, absoluteUrl, normalizeLang, pageForPath, IMAGE, SITE_NAME } from './pages';

function setMeta(selector: string, attribute: 'content' | 'href', value: string, create?: () => HTMLElement): void {
  let element = document.head.querySelector<HTMLElement>(selector);
  if (!element && create) {
    element = create();
    document.head.appendChild(element);
  }
  element?.setAttribute(attribute, value);
}

/**
 * What the pages are served with (see build-pages.ts) follows the visitor: the title, the description, the address and the
 * language of the document change with the page and with the language of the interface, so that a tab, a bookmark and a shared
 * link say what the visitor sees. The search engines read the served version; this keeps the tab honest.
 */
export function applyPageMeta(pathname: string, languageCode: string): void {
  const lang = normalizeLang(languageCode);
  const page = pageForPath(pathname);
  const title = page ? page.title[lang] : NOT_FOUND.title[lang];
  const description = page ? page.description[lang] : NOT_FOUND.description[lang];
  const url = absoluteUrl(page ? page.path : pathname);

  document.documentElement.lang = lang;
  document.title = title;
  setMeta('meta[name="description"]', 'content', description, () => Object.assign(document.createElement('meta'), { name: 'description' }));
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:url"]', 'content', url);
  setMeta('meta[property="og:image:alt"]', 'content', IMAGE.alt[lang]);
  setMeta('meta[property="og:site_name"]', 'content', SITE_NAME);
  setMeta('link[rel="canonical"]', 'href', url, () => Object.assign(document.createElement('link'), { rel: 'canonical' }));
}

export function usePageMeta(): void {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  useEffect(() => {
    applyPageMeta(pathname, i18n.language);
  }, [pathname, i18n.language]);
}
