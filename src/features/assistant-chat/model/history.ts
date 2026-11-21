import type { ChatMessage } from './conversation';
import { HISTORY_MAX_CHARS, HISTORY_MAX_MESSAGES, type HistoryMessage } from './events';

/**
 * What goes to the server as the dialogue so far: only what was said, never an empty or cut-off
 * answer, the newest messages first to survive the limits (messages and characters in total).
 */
export function trimHistory(messages: readonly ChatMessage[]): HistoryMessage[] {
  const said = messages.filter((m) => m.text.length > 0 && !m.interrupted && m.text.length <= HISTORY_MAX_CHARS);
  const kept: HistoryMessage[] = [];
  let chars = 0;
  for (let i = said.length - 1; i >= 0 && kept.length < HISTORY_MAX_MESSAGES; i--) {
    const m = said[i]!;
    if (chars + m.text.length > HISTORY_MAX_CHARS) break;
    chars += m.text.length;
    kept.unshift({ role: m.role, content: m.text });
  }
  return kept;
}
