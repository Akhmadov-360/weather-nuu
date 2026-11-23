import { ABOUT, DEFAULT_LANG, IMAGE, NOT_FOUND, PAGES, SITE_NAME, SITE_URL, absoluteUrl, type Lang, type PageSeo } from './pages';

/** The tags of a page that the search engines and the social networks read, between these two markers of index.html. */
export const SEO_START = '<!-- seo:start -->';
export const SEO_END = '<!-- seo:end -->';

const LOCALES: Record<Lang, string> = { ru: 'ru_RU', uz: 'uz_UZ', en: 'en_US' };

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** JSON for a script tag: the sequence `</` must not close the tag, and the line separators break old parsers. */
function safeJson(value: unknown): string {
  const escape = (c: string) => `${String.fromCharCode(92)}u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
  const unsafe = new RegExp(`[<${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}]`, 'g');
  return JSON.stringify(value).replace(unsafe, escape);
}

type Head = { title: string; description: string; path: string; indexable: boolean; breadcrumb?: { name: string; path: string }[] };

function structuredData(head: Head, lang: Lang) {
  const url = absoluteUrl(head.path);
  const graph: object[] = [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: ABOUT[lang],
      inLanguage: ['ru', 'uz', 'en'],
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: `${SITE_URL}/room`,
      description: ABOUT[lang],
      applicationCategory: 'EnvironmentalMonitoring',
      operatingSystem: 'Any (web browser)',
      isAccessibleForFree: true,
      inLanguage: ['ru', 'uz', 'en'],
      image: absoluteUrl(IMAGE.path),
    },
    { '@type': 'WebPage', '@id': `${url}#page`, url, name: head.title, description: head.description, inLanguage: lang, isPartOf: { '@id': `${SITE_URL}/#website` } },
  ];
  if (head.breadcrumb?.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: head.breadcrumb.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: absoluteUrl(b.path) })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** The block of tags for one page: title, description, canonical, robots, Open Graph, Twitter, the structured data. */
export function seoHead(head: Head, lang: Lang = DEFAULT_LANG, options: { structured?: boolean } = {}): string {
  const url = absoluteUrl(head.path);
  const image = absoluteUrl(IMAGE.path);
  const e = escapeHtml;
  const lines = [
    `<title>${e(head.title)}</title>`,
    `<meta name="description" content="${e(head.description)}" />`,
    `<link rel="canonical" href="${e(url)}" />`,
    `<meta name="robots" content="${head.indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow'}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${e(SITE_NAME)}" />`,
    `<meta property="og:title" content="${e(head.title)}" />`,
    `<meta property="og:description" content="${e(head.description)}" />`,
    `<meta property="og:url" content="${e(url)}" />`,
    `<meta property="og:locale" content="${LOCALES[lang]}" />`,
    ...(Object.keys(LOCALES) as Lang[]).filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${LOCALES[l]}" />`),
    `<meta property="og:image" content="${e(image)}" />`,
    `<meta property="og:image:width" content="${IMAGE.width}" />`,
    `<meta property="og:image:height" content="${IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${e(IMAGE.alt[lang])}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${e(head.title)}" />`,
    `<meta name="twitter:description" content="${e(head.description)}" />`,
    `<meta name="twitter:image" content="${e(image)}" />`,
    `<meta name="twitter:image:alt" content="${e(IMAGE.alt[lang])}" />`,
  ];
  if (options.structured !== false && head.indexable) lines.push(`<script type="application/ld+json">${safeJson(structuredData(head, lang))}</script>`);
  return lines.map((l) => `    ${l}`).join('\n');
}

/** What a visitor without JavaScript (and a crawler that does not run it) reads: the name, the idea and the links. */
export function noscriptBlock(lang: Lang = DEFAULT_LANG): string {
  const links = PAGES.filter((p) => p.indexable).map((p) => `<li><a href="${p.path}">${escapeHtml(p.heading[lang])}</a></li>`);
  return `<noscript><main style="font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5"><h1>${escapeHtml(SITE_NAME)}</h1><p>${escapeHtml(ABOUT[lang])}</p><ul>${links.join('')}</ul></main></noscript>`;
}

/** The built index.html with its block of tags and its noscript replaced for another page. */
export function renderPage(template: string, head: Head, lang: Lang = DEFAULT_LANG): string {
  const start = template.indexOf(SEO_START);
  const end = template.indexOf(SEO_END);
  if (start < 0 || end < start) throw new Error(`index.html has no ${SEO_START} ... ${SEO_END} block`);
  const block = `${SEO_START}\n${seoHead(head, lang)}\n    ${SEO_END}`;
  const withHead = template.slice(0, start) + block + template.slice(end + SEO_END.length);
  const noscript = noscriptBlock(lang);
  return /<noscript>[\s\S]*?<\/noscript>/.test(withHead) ? withHead.replace(/<noscript>[\s\S]*?<\/noscript>/, noscript) : withHead.replace('<div id="root"></div>', `<div id="root"></div>\n  ${noscript}`);
}

export function pageHead(page: PageSeo, lang: Lang = DEFAULT_LANG): Head {
  return {
    title: page.title[lang],
    description: page.description[lang],
    path: page.path,
    indexable: page.indexable,
    breadcrumb: [{ name: SITE_NAME, path: '/room' }, { name: page.heading[lang], path: page.path }],
  };
}

export const notFoundHead = (lang: Lang = DEFAULT_LANG): Head => ({ title: NOT_FOUND.title[lang], description: NOT_FOUND.description[lang], path: '/404', indexable: false });

/** The sitemap: only the pages that are for the index, with the date of the build. */
export function sitemapXml(date: string): string {
  const urls = PAGES.filter((p) => p.indexable).map(
    (p) => `  <url>\n    <loc>${escapeHtml(absoluteUrl(p.path))}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>hourly</changefreq>\n    <priority>${p.id === 'room' ? '1.0' : '0.8'}</priority>\n  </url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** The rules for the robots: everything except the API, and where the sitemap is. */
export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

/** The files that the build adds next to index.html: a page for every address, the 404, the sitemap and the robots rules. */
export function buildSeoFiles(template: string, date: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const page of PAGES) files[`${page.id}.html`] = renderPage(template, pageHead(page));
  files['404.html'] = renderPage(template, notFoundHead());
  files['sitemap.xml'] = sitemapXml(date);
  files['robots.txt'] = robotsTxt();
  return files;
}
