import { useQuery } from '@tanstack/react-query';
import { getVentilationAdvice } from './ventilation.api';

const MINUTE = 60_000;

/** The server keeps the advice for a minute; the page asks every two. */
export function useVentilationAdviceQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['ventilation', 'advice'],
    queryFn: getVentilationAdvice,
    enabled,
    refetchInterval: 2 * MINUTE,
    staleTime: MINUTE,
    // A failed card must not take the page with it: one quiet retry, then the card hides itself.
    retry: 1,
  });
}
