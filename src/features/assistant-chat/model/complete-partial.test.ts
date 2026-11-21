import { describe, expect, it } from 'vitest';
import { completePartialMarkdown } from './complete-partial';

describe('completePartialMarkdown', () => {
  it('closes bold that has not been closed yet', () => {
    expect(completePartialMarkdown('Сейчас **24')).toBe('Сейчас **24**');
  });

  it('closes inline code that has not been closed yet', () => {
    expect(completePartialMarkdown('значение `pm25')).toBe('значение `pm25`');
  });

  it('leaves an open code block for the renderer, which shows it as code to the end', () => {
    const open = ['```', 'const a = 1'].join(String.fromCharCode(10));
    expect(completePartialMarkdown(open)).toBe(open);
  });

  it('hides a marker that has no content yet, but keeps a closing one', () => {
    expect(completePartialMarkdown('Сейчас **')).toBe('Сейчас');
    expect(completePartialMarkdown('Сейчас *')).toBe('Сейчас');
    expect(completePartialMarkdown('и `')).toBe('и');
    expect(completePartialMarkdown('Сейчас **24**')).toBe('Сейчас **24**');
    expect(completePartialMarkdown('Сейчас *24*')).toBe('Сейчас *24*');
  });

  it('leaves finished text as it is', () => {
    const finished = 'Сейчас **24,7 °C**, влажность `38 %`.';
    expect(completePartialMarkdown(finished)).toBe(finished);
  });

  it('does not count an asterisk inside code as markup', () => {
    expect(completePartialMarkdown('`a * b`')).toBe('`a * b`');
  });

  it('keeps plain text and the empty string', () => {
    expect(completePartialMarkdown('')).toBe('');
    expect(completePartialMarkdown('Ұшақ ш ў')).toBe('Ұшақ ш ў');
  });
});
