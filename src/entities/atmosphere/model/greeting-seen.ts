import type { EventId } from './calendar';

export type SeenMap = Record<string, string>;

/** A holiday greeting shows once a day per event; the map keeps the last day each one was shown. */
export function shouldShowGreeting(event: EventId | null, today: string, seen: SeenMap): boolean {
  return event !== null && seen[event] !== today;
}

export function markGreetingSeen(event: EventId, today: string, seen: SeenMap): SeenMap {
  return { ...seen, [event]: today };
}

/** Parses what was stored; anything that is not a map of strings counts as "nothing seen yet". */
export function loadSeen(raw: string | null): SeenMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const out: SeenMap = {};
    for (const [key, value] of Object.entries(parsed)) if (typeof value === 'string') out[key] = value;
    return out;
  } catch {
    return {};
  }
}
