import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLatestWeather, getWeatherHistory } from "./weather.api";
import { ENV } from "@/shared/config/env";
import type { WeatherPageType } from "@/shared/types/common";
import type { WeatherHistoryItem, WeatherLatest } from "../model/weather.types";

export function useLatestWeatherQuery(type: WeatherPageType) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["weather", type, "latest"],
    queryFn: async () => {
      const data = await getLatestWeather(type);

      // Аппендим новую точку в кэш истории без повторного запроса
      queryClient.setQueryData<WeatherHistoryItem[]>(
        ["weather", type, "history"],
        (prev) => {
          if (!prev) return prev;
          const last = prev.at(-1);
          if (last && last.date === data.date) return prev;
          return [...prev, data];
        },
      );

      return data;
    },
    refetchInterval: ENV.latestPollingMs,
  });
}

export function useWeatherHistoryQuery(type: WeatherPageType) {
  return useQuery({
    queryKey: ["weather", type, "history"],
    queryFn: () => getWeatherHistory(type),
    // Полное обновление истории раз в 5 минут — на случай пропущенных точек
    refetchInterval: ENV.historyPollingMs,
    staleTime: ENV.historyPollingMs,
  });
}

// Типизированный хелпер для подписки на актуальную точку без лишних рендеров
export function useLatestPoint(type: WeatherPageType): WeatherLatest | undefined {
  return useLatestWeatherQuery(type).data;
}
