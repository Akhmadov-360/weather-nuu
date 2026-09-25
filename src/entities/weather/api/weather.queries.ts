import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLatestWeather, getWeatherAggregate, getWeatherHistory } from "./weather.api";
import { ENV } from "@/shared/config/env";
import { CLIENT_ONLY_RANGES, RANGE_TO_HOURS, type CustomDateRange, type TimeRange } from "@/shared/lib/date/filter-by-range";
import type { WeatherPageType } from "@/shared/types/common";
import { appendHistoryPoint } from "../model/append-history-point";
import type { WeatherHistoryItem, WeatherLatest } from "../model/weather.types";

/**
 * Threshold at which we switch from raw pagination to bucketed aggregation
 * for a custom calendar range. 7 days = the practical ceiling at which
 * ~15k raw records still fit two paginated pages, so under it the extra
 * fidelity is essentially free. Above it the raw path costs seconds and
 * MB, and hourly aggregate carries the same visual signal much cheaper.
 * Kept as a public constant so the UI can label the mode transition too.
 */
export const AGGREGATE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

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
 * Preset ranges (7д / 30д / 90д) now always use the bucketed aggregate
 * endpoint — a single ~1500-point response instead of dozens of raw
 * paginated pages. 1h/6h/24h still ride the live cache client-side.
 * `enabled` is off for the ranges that don't need a server fetch.
 */
export function useWeatherHistoryRangeQuery(type: WeatherPageType, range: TimeRange) {
  const needsServerFetch = !CLIENT_ONLY_RANGES.has(range);
  const hours = RANGE_TO_HOURS[range];
  const to = new Date();
  const from = hours ? new Date(to.getTime() - hours * 60 * 60 * 1000) : null;

  return useQuery({
    queryKey: ["weather", type, "aggregate", "range", range],
    queryFn: () => getWeatherAggregate(type, { from: from!, to }),
    enabled: needsServerFetch && from !== null,
    staleTime: 60_000,
  });
}

/**
 * Custom calendar range picks its transport by span: ≤7 days keeps the
 * raw paginated path (higher resolution, cheap enough), wider goes
 * through the aggregate endpoint. The consumer inspects `mode` to know
 * whether it got `WeatherHistoryItem[]` or an `AggregateBucketData`.
 */
export function useWeatherHistoryCustomRangeQuery(
  type: WeatherPageType,
  range: CustomDateRange | null,
) {
  const spanMs = range ? range.to.getTime() - range.from.getTime() : 0;
  const mode: "raw" | "aggregate" = spanMs > AGGREGATE_THRESHOLD_MS ? "aggregate" : "raw";

  const rawQuery = useQuery({
    queryKey: ["weather", type, "history", "custom-raw", range?.from.toISOString(), range?.to.toISOString()],
    queryFn: () => {
      // Convert span to `hours` so getWeatherHistory can build `from`.
      const hours = Math.max(1, Math.ceil(spanMs / 3_600_000));
      return getWeatherHistory(type, { hours });
    },
    enabled: range !== null && mode === "raw",
    staleTime: 60_000,
  });

  const aggregateQuery = useQuery({
    queryKey: ["weather", type, "aggregate", "custom", range?.from.toISOString(), range?.to.toISOString()],
    queryFn: () => getWeatherAggregate(type, range!),
    enabled: range !== null && mode === "aggregate",
    staleTime: 60_000,
  });

  return { mode, rawQuery, aggregateQuery };
}
