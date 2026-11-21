import { describe, expect, it } from 'vitest';
import { createSseParser } from './sse';

const encoder = new TextEncoder();

function frame(event: object, newline = '\n'): string {
  const { type } = event as { type: string };
  return `event: ${type}${newline}data: ${JSON.stringify(event)}${newline}${newline}`;
}

/** Feeds the bytes in pieces of the given sizes and returns everything the parser produced. */
function feed(bytes: Uint8Array, cuts: number[]) {
  const parser = createSseParser();
  const out = [];
  let from = 0;
  for (const cut of [...cuts, bytes.length]) {
    out.push(...parser.push(bytes.slice(from, cut)));
    from = cut;
  }
  out.push(...parser.end());
  return out;
}

describe('createSseParser', () => {
  it('reads one event', () => {
    const events = feed(encoder.encode(frame({ type: 'text', delta: 'Привет' })), []);
    expect(events).toEqual([{ type: 'text', delta: 'Привет' }]);
  });

  it('reads two events that arrive in one piece', () => {
    const bytes = encoder.encode(frame({ type: 'tool_start', id: 't1', name: 'get_current' }) + frame({ type: 'text', delta: 'a' }));
    expect(feed(bytes, [])).toHaveLength(2);
  });

  it('puts an event back together when it is cut in the middle of a data line', () => {
    const bytes = encoder.encode(frame({ type: 'text', delta: 'Сейчас 24,7 °C' }));
    for (let cut = 1; cut < bytes.length; cut++) {
      expect(feed(bytes, [cut]), `cut at ${cut}`).toEqual([{ type: 'text', delta: 'Сейчас 24,7 °C' }]);
    }
  });

  it('does not break a two-byte letter cut between two pieces (no replacement characters)', () => {
    const text = 'ш ў ы я';
    const bytes = encoder.encode(frame({ type: 'text', delta: text }));
    const events = [];
    // Cut after every single byte: each Cyrillic letter and ў is split in the middle.
    const cuts = Array.from({ length: bytes.length - 1 }, (_, i) => i + 1);
    events.push(...feed(bytes, cuts));
    expect(events).toEqual([{ type: 'text', delta: text }]);
    expect(JSON.stringify(events)).not.toContain('�');
  });

  it('reads Windows line endings the same as Unix ones', () => {
    const events = feed(encoder.encode(frame({ type: 'text', delta: 'a' }, '\r\n')), []);
    expect(events).toEqual([{ type: 'text', delta: 'a' }]);
  });

  it('reads Windows line endings when \\r and \\n arrive in different pieces', () => {
    const bytes = encoder.encode(frame({ type: 'text', delta: 'a' }, '\r\n'));
    for (let cut = 1; cut < bytes.length; cut++) {
      expect(feed(bytes, [cut]), `cut at ${cut}`).toEqual([{ type: 'text', delta: 'a' }]);
    }
  });

  it('ignores comment lines such as the keep-alive ping', () => {
    const bytes = encoder.encode(`: ping\n\n${frame({ type: 'text', delta: 'a' })}: ping\n\n`);
    expect(feed(bytes, [])).toEqual([{ type: 'text', delta: 'a' }]);
  });

  it('skips an event of an unknown type or with broken JSON and keeps reading', () => {
    const bytes = encoder.encode(
      `event: thought\ndata: {"type":"thought","delta":"x"}\n\n` +
        `event: text\ndata: {not json\n\n` +
        frame({ type: 'text', delta: 'ok' }),
    );
    expect(feed(bytes, [])).toEqual([{ type: 'text', delta: 'ok' }]);
  });

  it('delivers a last event that has no blank line after it when the stream ends', () => {
    const bytes = encoder.encode(`event: done\ndata: {"type":"done","inputTokens":1,"outputTokens":2}`);
    expect(feed(bytes, [])).toEqual([{ type: 'done', inputTokens: 1, outputTokens: 2 }]);
  });
});
