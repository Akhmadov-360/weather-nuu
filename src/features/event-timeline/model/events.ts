import { z } from 'zod';

/**
 * The answer of `GET /v1/events`, as the backend contract defines it (weather-backend:
 * packages/contracts/src/schemas/events.ts). A copy, because the two repositories share no code;
 * `events.example.json` is the same file on both sides and the tests of each side check it.
 */
export const EVENT_CLASSES = ['ventilation', 'class_start', 'class_end', 'cleaning', 'ac'] as const;
export type EventClass = (typeof EVENT_CLASSES)[number];

export const RoomEventSchema = z.object({
  cls: z.enum(EVENT_CLASSES),
  start: z.string().datetime({ offset: true }),
  detected: z.string().datetime({ offset: true }),
  confirmedByStreet: z.boolean().nullable(),
});
export type RoomEvent = z.infer<typeof RoomEventSchema>;

export const EventsResponseSchema = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  events: z.array(RoomEventSchema),
  method: z.object({ name: z.literal('cusum-rules-v1'), experimental: z.boolean(), classes: z.array(z.enum(EVENT_CLASSES)) }),
  coverageMinutes: z.number().int().nonnegative(),
});
export type EventsResponse = z.infer<typeof EventsResponseSchema>;

/** The period the timeline shows: the last day. */
export const TIMELINE_HOURS = 24;
/** How many of the latest events the compact list shows. */
export const TIMELINE_MAX_ITEMS = 6;

/** Newest first, and at most `limit`; the rest is counted so that the card can say "and 3 more". */
export function latestEvents(events: readonly RoomEvent[], limit: number = TIMELINE_MAX_ITEMS): { shown: RoomEvent[]; hidden: number } {
  const sorted = [...events].sort((a, b) => b.start.localeCompare(a.start));
  return { shown: sorted.slice(0, limit), hidden: Math.max(0, sorted.length - limit) };
}

/** Less than half of the period has readings: "no events" may then mean "no data", and the card says so. */
export function hasLittleData(response: Pick<EventsResponse, 'coverageMinutes'>, hours: number = TIMELINE_HOURS): boolean {
  return response.coverageMinutes < hours * 60 * 0.5;
}
