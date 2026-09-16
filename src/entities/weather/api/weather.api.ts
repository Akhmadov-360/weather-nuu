import { http } from "@/shared/api/http";
import { ENV } from "@/shared/config/env";
import { mapWeatherHistory, mapWeatherLatest } from "@/entities/weather/model/weather.mapper";
import type { WeatherPageType } from "@/shared/types/common";
import type { WeatherHistoryItem, WeatherLatest } from "@/entities/weather/model/weather.types";

const PATHS = ENV.endpoints;

export async function getLatestWeather(type: WeatherPageType): Promise<WeatherLatest> {
  const { data } = await http.get(PATHS[type].latest);
  return mapWeatherLatest(data);
}

export async function getWeatherHistory(
  type: WeatherPageType,
  opts?: { hours?: number; limit?: number },
): Promise<WeatherHistoryItem[]> {
  const { data } = await http.get(PATHS[type].history, { params: opts });
  return mapWeatherHistory(data);
}
