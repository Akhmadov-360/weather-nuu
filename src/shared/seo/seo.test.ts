// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SECTIONS } from '../config/sections';
import { SEO_END, SEO_START, buildSeoFiles, escapeHtml, noscriptBlock, notFoundHead, pageHead, renderPage, robotsTxt, seoHead, sitemapXml } from './build-pages';
import { ABOUT, LANGS, NOT_FOUND, PAGES, SITE_URL, absoluteUrl, normalizeLang, pageForPath } from './pages';
import { applyPageMeta } from './use-page-meta';

const template = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const room = PAGES.find((p) => p.id === 'room')!;

describe('the texts', () => {
  it('exist in all three languages for every page, with sizes that a search result can show', () => {
    for (const page of PAGES) {
      for (const lang of LANGS) {
        expect(page.title[lang].length, `${page.id} title ${lang}`).toBeGreaterThan(10);
        expect(page.title[lang].length, `${page.id} title ${lang}`).toBeLessThanOrEqual(70);
        expect(page.description[lang].length, `${page.id} description ${lang}`).toBeGreaterThan(30);
        expect(page.description[lang].length, `${page.id} description ${lang}`).toBeLessThanOrEqual(170);
        expect(page.heading[lang].length).toBeGreaterThan(2);
      }
    }
    for (const lang of LANGS) {
      expect(ABOUT[lang].length).toBeGreaterThan(100);
      expect(NOT_FOUND.title[lang].length).toBeGreaterThan(5);
    }
  });

  it('keep the titles and the descriptions of the indexed pages different from each other', () => {
    const indexed = PAGES.filter((p) => p.indexable);
    for (const lang of LANGS) {
      expect(new Set(indexed.map((p) => p.title[lang])).size).toBe(indexed.length);
      expect(new Set(indexed.map((p) => p.description[lang])).size).toBe(indexed.length);
    }
  });

  it('say that a page is for the index exactly when its section is on in the navigation', () => {
    for (const page of PAGES) expect(page.indexable).toBe(SECTIONS.find((s) => s.id === page.id)!.enabled);
  });
});

describe('addresses', () => {
  it('finds a page by its address, with or without a closing slash, and nothing else', () => {
    expect(pageForPath('/room')?.id).toBe('room');
    expect(pageForPath('/street/')?.id).toBe('street');
    expect(pageForPath('/nothing')).toBeUndefined();
    expect(pageForPath('/')).toBeUndefined();
  });

  it('makes absolute addresses and reads the language of the interface', () => {
    expect(absoluteUrl('/room')).toBe(`${SITE_URL}/room`);
    expect(normalizeLang('uz-Latn')).toBe('uz');
    expect(normalizeLang('EN-us')).toBe('en');
    expect(normalizeLang('de')).toBe('ru');
    expect(normalizeLang(undefined)).toBe('ru');
  });
});

describe('the tags of a page', () => {
  const head = seoHead(pageHead(room), 'ru');

  it('have the title, the description, the canonical address and the social card with ABSOLUTE addresses', () => {
    expect(head).toContain(`<title>${escapeHtml(room.title.ru)}</title>`);
    expect(head).toContain(`<meta name="description" content="${escapeHtml(room.description.ru)}" />`);
    expect(head).toContain('<link rel="canonical" href="https://weather.nuu.uz/room" />');
    expect(head).toContain('<meta property="og:image" content="https://weather.nuu.uz/og-image.png" />');
    expect(head).toContain('<meta property="og:url" content="https://weather.nuu.uz/room" />');
    expect(head).toContain('<meta property="og:locale" content="ru_RU" />');
    expect(head).toContain('<meta property="og:locale:alternate" content="uz_UZ" />');
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(head).not.toMatch(/content="\/og-image/);
  });

  it('let an indexed page be indexed and keep a waiting or missing page out', () => {
    expect(head).toContain('index, follow');
    const map = PAGES.find((p) => p.id === 'map')!;
    expect(seoHead(pageHead(map))).toContain('noindex, follow');
    expect(seoHead(notFoundHead())).toContain('noindex, follow');
  });

  it('carry structured data that is valid JSON, only for indexed pages, and cannot close the script tag', () => {
    const match = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(head)!;
    const json = JSON.parse(match[1]!);
    const types = json['@graph'].map((x: { '@type': string }) => x['@type']);
    expect(types).toEqual(['WebSite', 'WebApplication', 'WebPage', 'BreadcrumbList']);
    expect(seoHead(pageHead(PAGES.find((p) => p.id === 'map')!))).not.toContain('ld+json');
    const hostile = seoHead({ title: 'a</script><script>alert(1)</script>', description: 'd', path: '/room', indexable: true });
    expect(hostile.match(/<\/script>/g)).toHaveLength(1);
    expect(hostile).not.toContain('<script>alert');
  });

  it('escape what must not reach the HTML as it is', () => {
    const evil = seoHead({ title: 'A "quoted" <b>title</b> & more', description: 'x"y', path: '/room', indexable: true }, 'ru', { structured: false });
    expect(evil).toContain('A &quot;quoted&quot; &lt;b&gt;title&lt;/b&gt; &amp; more');
    expect(evil).not.toContain('<b>');
  });

  it('say the language of the page in the structured data and the card', () => {
    const uz = seoHead(pageHead(room, 'uz'), 'uz');
    expect(uz).toContain('og:locale" content="uz_UZ"');
    expect(uz).toContain(room.title.uz.replace(/&/g, '&amp;'));
  });
});

describe('the pages that the build adds', () => {
  const files = buildSeoFiles(template, '2026-11-23');

  it('are one for every address, the 404, the sitemap and the robots rules', () => {
    expect(Object.keys(files).sort()).toEqual(['404.html', 'analytics.html', 'map.html', 'robots.txt', 'room.html', 'sitemap.xml', 'street.html']);
  });

  it('keep everything else of index.html (the scripts and the styles) and change only the tags and the noscript', () => {
    const built = template.replace('<script type="module" src="/src/app/main.tsx"></script>', '<script type="module" src="/assets/x.js"></script><link rel="stylesheet" href="/assets/x.css">');
    const page = renderPage(built, pageHead(room));
    expect(page).toContain('<script type="module" src="/assets/x.js"></script>');
    expect(page).toContain('<link rel="stylesheet" href="/assets/x.css">');
    expect(page.match(/<title>/g)).toHaveLength(1);
    expect(page.match(/rel="canonical"/g)).toHaveLength(1);
    expect(page.match(/<noscript>/g)).toHaveLength(1);
    expect(page).toContain('<div id="root"></div>');
  });

  it('give the 404 page its own title and no index', () => {
    expect(files['404.html']).toContain(`<title>${NOT_FOUND.title.ru}</title>`);
    expect(files['404.html']).toContain('noindex');
  });

  it('fail loudly when index.html lost its markers, instead of shipping the tags of the whole site on every page', () => {
    expect(() => renderPage('<html><head></head><body></body></html>', pageHead(room))).toThrow(/seo:start/);
    expect(template).toContain(SEO_START);
    expect(template).toContain(SEO_END);
  });

  it('write a noscript text with real content and links to the indexed pages only', () => {
    const block = noscriptBlock('ru');
    expect(block).toContain('<h1>');
    expect(block).toContain('href="/room"');
    expect(block).toContain('href="/street"');
    expect(block).not.toContain('href="/map"');
  });
});

describe('the sitemap and the robots rules', () => {
  const xml = sitemapXml('2026-11-23');

  it('list the indexed pages with their dates and no placeholder, no redirect and no API address', () => {
    expect(xml).toContain('<loc>https://weather.nuu.uz/room</loc>');
    expect(xml).toContain('<loc>https://weather.nuu.uz/street</loc>');
    expect(xml).not.toContain('/map');
    expect(xml).not.toContain('/analytics');
    expect(xml).not.toContain('/api');
    expect(xml).toContain('<lastmod>2026-11-23</lastmod>');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('let the crawlers in, keep them out of the API and say where the sitemap is', () => {
    const robots = robotsTxt();
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Sitemap: https://weather.nuu.uz/sitemap.xml');
  });
});

describe('the tags in the browser', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    document.title = '';
    document.documentElement.lang = '';
  });

  it('follow the page and the language: the title, the description, the card, the address and the language of the document', () => {
    applyPageMeta('/street', 'en');
    expect(document.title).toBe(PAGES.find((p) => p.id === 'street')!.title.en);
    expect(document.documentElement.lang).toBe('en');
    expect(document.head.querySelector('meta[name="description"]')!.getAttribute('content')).toBe(PAGES.find((p) => p.id === 'street')!.description.en);
    expect(document.head.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe('https://weather.nuu.uz/street');
    applyPageMeta('/room', 'uz-Latn');
    expect(document.title).toBe(room.title.uz);
    expect(document.documentElement.lang).toBe('uz');
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });

  it('update the tags that the page has and do not add a second copy of them', () => {
    document.head.innerHTML = '<meta property="og:title" content="old" /><meta property="og:url" content="old" />';
    applyPageMeta('/room', 'ru');
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(document.head.querySelector('meta[property="og:title"]')!.getAttribute('content')).toBe(room.title.ru);
    expect(document.head.querySelector('meta[property="og:url"]')!.getAttribute('content')).toBe('https://weather.nuu.uz/room');
  });

  it('give an address that is not a page the title of the 404', () => {
    applyPageMeta('/nothing', 'ru');
    expect(document.title).toBe(NOT_FOUND.title.ru);
  });
});
