import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

const html = (text: string, streaming = false) => renderToStaticMarkup(<Markdown text={text} streaming={streaming} />);

describe('Markdown links', () => {
  it('opens a normal link in a new tab without leaking the opener', () => {
    const out = html('[Open-Meteo](https://open-meteo.com)');
    expect(out).toContain('href="https://open-meteo.com"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'vbscript:msgbox(1)', 'mailto:a@b.uz', '//evil.example'])(
    'does not make a link of %s',
    (url) => {
      const out = html(`[нажми](${url})`);
      expect(out).not.toContain('href=');
      expect(out).toContain('нажми');
    },
  );
});

describe('Markdown raw HTML', () => {
  it('does not let an image with a handler into the page', () => {
    const out = html('<img src=x onerror=alert(1)> привет');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('onerror');
  });

  it('does not let a script through', () => {
    expect(html('<script>alert(1)</script>ok')).not.toContain('<script');
  });
});

describe('Markdown formatting', () => {
  it('renders bold, code and lists', () => {
    const out = html('Сейчас **24,7 °C**, `pm25`\n\n- один\n- два');
    expect(out).toContain('<strong>24,7 °C</strong>');
    expect(out).toContain('<code>pm25</code>');
    expect(out).toContain('<li>один</li>');
  });

  it('keeps Cyrillic and Uzbek letters as they are', () => {
    expect(html("Auditoriyada o'zgarish: ш ў")).toContain("o&#x27;zgarish: ш ў");
  });
});

describe('Markdown while the answer is arriving', () => {
  const sample = 'Сейчас **24,7 °C** и `код` — [Open-Meteo](https://open-meteo.com) и *курсив*\n\n- пункт **жир**\n\n```\nconst a = 1\n```';

  it('never shows loose markup characters for any prefix of the answer', () => {
    for (let i = 1; i <= sample.length; i++) {
      const out = renderToStaticMarkup(<Markdown text={sample.slice(0, i)} streaming />);
      // Remove the contents of finished code spans and blocks, where these characters are legitimate.
      const visible = out.replace(/<code>[\s\S]*?<\/code>/g, '').replace(/<[^>]+>/g, '');
      expect(visible, `prefix of ${i} characters`).not.toMatch(/\*\*|`/);
      expect(out, `prefix of ${i} characters`).not.toMatch(/streamdown|incomplete/i);
    }
  });

  it('does not make a link out of a half-written one', () => {
    const out = renderToStaticMarkup(<Markdown text="Смотрите [Open-Meteo](https://open-m" streaming />);
    expect(out).not.toContain('open-m"');
    expect(out).toContain('Open-Meteo');
  });

  it('shows a finished answer exactly as written, without completing anything', () => {
    expect(html('2 ** 3', false)).toContain('2 ** 3');
  });
});
