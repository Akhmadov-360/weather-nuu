import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const uz = JSON.parse(readFileSync(resolve(__dirname, 'uz/common.json'), 'utf8')) as Record<string, string>;

describe('Uzbek typography', () => {
  it('uses the typographic apostrophe ‘ in the holiday greetings, not the straight one', () => {
    const greetings = Object.entries(uz).filter(([key]) => /^greeting_(navruz|independence|teachers|constitution|new_year)$/.test(key));
    expect(greetings.length).toBe(5);
    for (const [key, value] of greetings) expect(value, key).not.toContain("'");
    expect(uz.greeting_navruz).toContain('‘');
    expect(uz.greeting_new_year).toContain('‘');
  });
});
