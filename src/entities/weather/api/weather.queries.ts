import { useQuery } from '@tanstack/react-query';
import { getLatestWeather, getWeatherHistory } from './weather.api';
import { ENV } from '@/shared/config/env';
import type { WeatherPageType } from '@/shared/types/common';

export function useLatestWeatherQuery(type: WeatherPageType) {
  return useQuery({
    queryKey: ['weather', type, 'latest'],
    queryFn: () => getLatestWeather(type),
    refetchInterval: ENV.latestPollingMs,
  });
}

export function useWeatherHistoryQuery(type: WeatherPageType) {
  return useQuery({
    queryKey: ['weather', type, 'history'],
    queryFn: () => getWeatherHistory(type),
  });
}
