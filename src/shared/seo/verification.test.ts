import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The file with which Google Search Console confirms that the site is ours. It must stay on the site for ever: deleting it
 * takes the confirmation away. Its name and its one line are given by Google and are the same.
 */
describe('the file of confirmation of Google Search Console', () => {
  const name = 'google8c9e1b3bab4d304b.html';
  const path = resolve(process.cwd(), 'public', name);

  it('is in public/, so that every build puts it at the root of the site', () => {
    expect(existsSync(path)).toBe(true);
  });

  it('has the one line that Google asks for, with its own name', () => {
    expect(readFileSync(path, 'utf8').trim()).toBe(`google-site-verification: ${name}`);
  });
});
