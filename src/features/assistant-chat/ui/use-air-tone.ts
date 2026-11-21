import { useQuery } from '@tanstack/react-query';
import type { WeatherLatest } from '@/entities/weather/model/weather.types';
import { orbToneFor, type OrbTone } from '../model/orb-tone';

/**
 * The colour of the orb from the room's latest reading that the dashboard has already loaded. It only reads the
 * cache (`enabled: false`): it never asks the server itself, and shows the neutral tone until a reading exists.
 */
export function useAirTone(): OrbTone {
  const { data } = useQuery<WeatherLatest>({ queryKey: ['weather', 'room', 'latest'], enabled: false, staleTime: Infinity });
  return orbToneFor(data?.pm25);
}
