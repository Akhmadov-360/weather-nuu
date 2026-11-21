import { AssistantEventSchema, type AssistantEvent } from './events';

export type SseParser = {
  /** Feed the next piece of the response body; returns the events that are complete now. */
  push(bytes: Uint8Array): AssistantEvent[];
  /** The stream ended: returns a last event that had no blank line after it. */
  end(): AssistantEvent[];
};

/**
 * Reads Server-Sent Events from raw bytes. It keeps what is left between two pieces, so an event or a
 * letter cut in the middle is put back together: the decoder runs in streaming mode (a Cyrillic letter
 * or ў is two bytes and may arrive in halves), and a "\r" at the end of a piece waits for a "\n" that
 * may come in the next one. Comments (": ping"), events of an unknown type and broken JSON are skipped.
 */
export function createSseParser(): SseParser {
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  function parseBlock(block: string): AssistantEvent | null {
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line === '' || line.startsWith(':')) continue;
      if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    }
    if (data.length === 0) return null;
    try {
      const parsed = AssistantEventSchema.safeParse(JSON.parse(data.join('\n')));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  function drain(final: boolean): AssistantEvent[] {
    // A "\r" at the very end may be the first half of "\r\n": keep it for the next piece.
    const hold = !final && buffer.endsWith('\r') ? '\r' : '';
    const ready = (hold ? buffer.slice(0, -1) : buffer).replace(/\r\n|\r/g, '\n');
    const blocks = ready.split('\n\n');
    const rest = blocks.pop() ?? '';
    const events: AssistantEvent[] = [];
    for (const block of blocks) {
      const event = parseBlock(block);
      if (event) events.push(event);
    }
    if (final) {
      const event = parseBlock(rest);
      if (event) events.push(event);
      buffer = '';
    } else {
      buffer = rest + hold;
    }
    return events;
  }

  return {
    push(bytes) {
      buffer += decoder.decode(bytes, { stream: true });
      return drain(false);
    },
    end() {
      buffer += decoder.decode();
      return drain(true);
    },
  };
}
