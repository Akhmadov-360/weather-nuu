import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLatestWeather, getWeatherHistory } from "./weather.api";
import { ENV } from "@/shared/config/env";
import { CLIENT_ONLY_RANGES, RANGE_TO_HOURS, customRangeToHours, type CustomDateRange, type TimeRange } from "@/shared/lib/date/filter-by-range";
import type { WeatherPageType } from "@/shared/types/common";
import { appendHistoryPoint } from "../model/append-history-point";
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
        (prev) => appendHistoryPoint(prev, data),
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

/**
 * Для 1h/6h/24h канонический live-кэш (useWeatherHistoryQuery, ≤24h,
 * обновляется WS/поллингом) уже содержит всё нужное — просто фильтруется
 * на клиенте, без лишнего запроса. Для 7d/30d/all бэку нужно спросить
 * данные за пределами тех 24h отдельным запросом — этот хук именно за
 * этим и нужен, `enabled` выключен для диапазонов, которым он не нужен.
 */
export function useWeatherHistoryRangeQuery(type: WeatherPageType, range: TimeRange) {
  const needsServerFetch = !CLIENT_ONLY_RANGES.has(range);
  const hours = RANGE_TO_HOURS[range];

  return useQuery({
    queryKey: ["weather", type, "history", "range", range],
    queryFn: () => getWeatherHistory(type, { hours, limit: 10_000 }),
    enabled: needsServerFetch,
    staleTime: 60_000,
  });
}

/**
 * Arbitrary calendar range — same "hours-based fetch, trim exactly on the
 * client" strategy as useWeatherHistoryRangeQuery, since the old backend
 * only understands `hours`, not explicit from/to bounds. Reused as-is by
 * the future export UI (same DateRangePicker primitive, same query shape).
 */
export function useWeatherHistoryCustomRangeQuery(type: WeatherPageType, range: CustomDateRange | null) {
  const hours = range ? customRangeToHours(range) : undefined;

  return useQuery({
    queryKey: ["weather", type, "history", "custom", range?.from.toISOString(), range?.to.toISOString()],
    queryFn: () => getWeatherHistory(type, { hours, limit: 10_000 }),
    enabled: range !== null,
    staleTime: 60_000,
  });
}
