// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '@/app/providers/i18n/i18n';
import { Sources } from './Sources';

afterEach(cleanup);

describe('Sources', () => {
  it('shows a document with an https address as a link that opens in a new tab, safely', () => {
    render(<Sources items={[{ id: 'a#1', title: 'WHO / Guidelines', source: 'WHO 2021', url: 'https://www.who.int/x' }]} />);
    const link = screen.getByRole('link', { name: /WHO 2021/ });
    expect(link.getAttribute('href')).toBe('https://www.who.int/x');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('title')).toBe('WHO / Guidelines');
  });

  it('shows a document without an address, or with an unsafe one, as text and not as a link', () => {
    render(
      <Sources
        items={[
          { id: 'b#1', title: 'T', source: 'Station notes' },
          { id: 'c#1', title: 'T', source: 'Odd source', url: 'javascript:alert(1)' },
          { id: 'd#1', title: 'T', source: 'Plain http', url: 'http://example.org' },
        ]}
      />,
    );
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    for (const name of ['Station notes', 'Odd source', 'Plain http']) expect(screen.getByText(name)).toBeTruthy();
  });

  it('has a label in every language', () => {
    render(<Sources items={[{ id: 'a#1', title: 'T', source: 'S' }]} />);
    expect(screen.getByTestId('assistant-sources').textContent).toMatch(/(Источники|Manbalar|Sources):/);
  });
});
