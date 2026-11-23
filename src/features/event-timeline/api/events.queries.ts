import { useQuery } from '@tanstack/react-query';
import { getRoomEvents } from './events.api';
import { TIMELINE_HOURS } from '../model/events';

const MINUTE = 60_000;

/** The events of the last day. The period moves with the clock, the answer is refreshed every five minutes. */
export function useRoomEventsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['events', 'room', TIMELINE_HOURS],
    queryFn: () => {
      const to = new Date();
      return getRoomEvents({ from: new Date(to.getTime() - TIMELINE_HOURS * 60 * MINUTE), to });
    },
    enabled,
    refetchInterval: 5 * MINUTE,
    staleTime: 4 * MINUTE,
    // A failed timeline must not take the page with it: one quiet retry, then the card hides itself.
    retry: 1,
  });
}
