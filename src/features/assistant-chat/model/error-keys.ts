import type { ChatErrorCode } from './events';

/** Which text of `assistant.json` says what went wrong. Typed by the code list: a new code does not build without a key. */
export const ERROR_KEYS: Record<ChatErrorCode, string> = {
  disabled: 'assistant_err_disabled',
  rate_limited: 'assistant_err_rate_limited',
  quota: 'assistant_err_quota',
  upstream: 'assistant_err_upstream',
  bad_request: 'assistant_err_bad_request',
  internal: 'assistant_err_internal',
  offline: 'assistant_err_offline',
};

/** The tools the interface has a sentence for. Each key is the tool's name on the server. */
export const TOOL_KEYS = {
  get_current: 'assistant_tool_get_current',
  get_period_summary: 'assistant_tool_get_period_summary',
  compare_room_street: 'assistant_tool_compare_room_street',
} as const;

export function toolKey(name: string): string {
  return (TOOL_KEYS as Record<string, string>)[name] ?? 'assistant_tool_unknown';
}
