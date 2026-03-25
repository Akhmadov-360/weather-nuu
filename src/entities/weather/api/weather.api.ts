import { http } from '@/shared/api/http';
import { ROOM_CONFIG, STREET_CONFIG } from '@/entities/weather/model/weather.constants';
import { mapWeatherHistory, mapWeatherLatest } from '@/entities/weather/model/weather.mapper';
import type { WeatherPageType } from '@/shared/types/common';
import type { WeatherHistoryItem, WeatherLatest } from '@/entities/weather/model/weather.types';

const PATHS = {
  room: ROOM_CONFIG.api,
  street: STREET_CONFIG.api,
} as const;

export async function getLatestWeather(type: WeatherPageType): Promise<WeatherLatest> {
  const { data } = await http.get(PATHS[type].latest);
  return mapWeatherLatest(data);
}

export async function getWeatherHistory(type: WeatherPageType): Promise<WeatherHistoryItem[]> {
  const { data } = await http.get(PATHS[type].history);
  return mapWeatherHistory(data);
}
