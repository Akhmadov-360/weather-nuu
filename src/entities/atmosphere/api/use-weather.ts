import { useQuery } from '@tanstack/react-query';

import type { Weather } from '../model/weather';
import { buildOpenMeteoUrl, mapOpenMeteo } from './open-meteo';

const QUARTER_HOUR_MS = 15 * 60_000;

/** Real weather for the street scene. Any failure leaves `data` undefined and the scene falls back to the season alone. */
export function useOpenMeteoWeather(enabled: boolean): Weather | undefined {
  const query = useQuery({
    queryKey: ['atmosphere', 'open-meteo'],
    queryFn: async () => {
      const res = await fetch(buildOpenMeteoUrl());
      if (!res.ok) throw new Error(`Open-Meteo answered ${res.status}`);
      const weather = mapOpenMeteo(await res.json());
      if (!weather) throw new Error('Open-Meteo returned an unexpected shape');
      return weather;
    },
    enabled,
    staleTime: QUARTER_HOUR_MS,
    refetchInterval: QUARTER_HOUR_MS,
    retry: 1,
  });
  return query.data;
}
