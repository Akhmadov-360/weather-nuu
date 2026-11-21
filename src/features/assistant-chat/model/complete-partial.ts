import remend from 'remend';

const count = (text: string, pattern: RegExp): number => (text.match(pattern) ?? []).length;

/**
 * A marker with nothing after it ("Сейчас **") is the start of markup that has no content yet. The
 * package leaves it in the text, so it would flash on the screen: cut it off until the content comes.
 * A closing marker at the end ("**24**") is kept: it has an opening one before it.
 */
function dropDanglingOpener(text: string): string {
  const backticks = /`{1,2}$/.exec(text);
  if (backticks && !text.endsWith('```')) return text.slice(0, -backticks[0].length);

  if (text.endsWith('~~') && count(text.slice(0, -2), /~~/g) % 2 === 0) return text.slice(0, -2);
  if (text.endsWith('**') && count(text.slice(0, -2), /\*\*/g) % 2 === 0) return text.slice(0, -2);
  if (text.endsWith('*') && !text.endsWith('**')) {
    const before = text.slice(0, -1).replace(/\*\*/g, '');
    if (count(before, /\*/g) % 2 === 0) return text.slice(0, -1);
  }
  return text;
}

/**
 * While an answer is still arriving it can end in the middle of markup ("**жир"). Shown as it is, the
 * text would flash the stars and then turn bold when the closing ones arrive. This closes whatever is
 * open (bold, italic, code, a half-written link) and hides markers that have no content yet, so every
 * prefix of the answer renders cleanly. Use it only while the stream runs: a finished answer is shown
 * as the model wrote it. `remend` does the closing; this wrapper is the one place to change if it is replaced.
 */
export function completePartialMarkdown(text: string): string {
  return remend(dropDanglingOpener(text));
}
