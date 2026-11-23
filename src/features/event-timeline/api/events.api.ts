import { http } from '@/shared/api/http';
import { ENV } from '@/shared/config/env';
import { EventsResponseSchema, type EventsResponse } from '../model/events';

/** The events of the room for a period (at most 7 days). `null` when the new API is not configured. */
export async function getRoomEvents(range: { from: Date; to: Date }): Promise<EventsResponse | null> {
  if (!ENV.exportBaseUrl) return null;
  const { data } = await http.get(`${ENV.exportBaseUrl}/v1/events`, {
    params: { from: range.from.toISOString(), to: range.to.toISOString() },
  });
  return EventsResponseSchema.parse(data);
}
