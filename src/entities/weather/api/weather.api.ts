import { http } from "@/shared/api/http";
import { ENV } from "@/shared/config/env";
import { mapWeatherHistory, mapWeatherLatest } from "@/entities/weather/model/weather.mapper";
import type { WeatherPageType } from "@/shared/types/common";
import type {
  AggregateBucketData,
  WeatherHistoryItem,
  WeatherLatest,
} from "@/entities/weather/model/weather.types";

const PATHS = ENV.endpoints;

export async function getLatestWeather(type: WeatherPageType): Promise<WeatherLatest> {
  const { data } = await http.get(PATHS[type].latest);
  return mapWeatherLatest(data);
}

/** apps/api hard-caps each `/v1/sensors/:source/history` page at 10 000. */
const PAGE_LIMIT = 10_000;

/**
 * Hard cap on total records the client will pull for one history query,
 * across paginated pages. Sized to cover the current dataset (~1.1M rows
 * over 9 months for the room sensor) plus room for growth. On very large
 * ranges the chart itself becomes the bottleneck, not the fetch — proper
 * server-side downsampling belongs behind a separate query key.
 */
const MAX_TOTAL = 2_000_000;

/**
 * apps/api's /v1/sensors/:source/history uses keyset pagination:
 * - no bounds → returns the OLDEST rows first (ascending), page-capped at 10k
 * - `from` → readings from that instant forward, ascending
 * - `cursor` → continue from where the previous page ended
 *
 * The old backend understood `hours`; the new one doesn't. So we translate
 * `hours` into an explicit `from`, then keep paginating via `nextCursor`
 * until the server says there are no more pages. Without this loop, the
 * client only ever saw the first 10k rows — which for the "All" range on
 * this dataset stopped at ~Apr 2026 even though data goes to Sep 2026.
 */
export async function getWeatherHistory(
  type: WeatherPageType,
  opts?: { hours?: number },
): Promise<WeatherHistoryItem[]> {
  const hours = opts?.hours ?? 24;
  const from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const allItems: unknown[] = [];
  let cursor: string | undefined;

  while (allItems.length < MAX_TOTAL) {
    const params: Record<string, unknown> = { limit: PAGE_LIMIT };
    if (cursor) params.cursor = cursor;
    else params.from = from;

    const { data } = await http.get(PATHS[type].history, { params });

    // Legacy backend shape: bare array, no cursor — nothing more to page.
    if (Array.isArray(data)) {
      allItems.push(...data);
      break;
    }
    // New backend shape: { items, nextCursor }.
    if (data?.items) allItems.push(...data.items);
    if (!data?.nextCursor) break;
    cursor = data.nextCursor as string;
  }

  return mapWeatherHistory({ items: allItems });
}

/**
 * Bounds for the sensor's real historical range — used by the calendar to
 * disable dates before the first recorded reading. Returns null when the
 * meta endpoint isn't reachable (old backend without /v1/export/:source/meta,
 * or ENV.exportBaseUrl not configured) — the caller should treat that as
 * "no lower bound known" rather than a hard error.
 */
export async function getSensorBounds(
  type: WeatherPageType,
): Promise<{ earliest: Date | null; latest: Date | null } | null> {
  if (!ENV.exportBaseUrl) return null;
  try {
    const { data } = await http.get(`${ENV.exportBaseUrl}/v1/export/${type}/meta`);
    return {
      earliest: data?.earliestRecordedAt ? new Date(data.earliestRecordedAt) : null,
      latest: data?.latestRecordedAt ? new Date(data.latestRecordedAt) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Bucketed aggregate history — the analytics-side complement to the raw
 * paginated `getWeatherHistory`. One HTTP call returns ~500-1500 bucket
 * rows regardless of span, each carrying count/avg/min/max per metric.
 * Server picks the bucket automatically based on the span; response
 * includes `bucket` so the client knows what the x-axis actually
 * represents. See apps/api/src/modules/sensors/sensors.aggregate.repo.ts.
 */
export async function getWeatherAggregate(
  type: WeatherPageType,
  range: { from: Date; to: Date },
): Promise<AggregateBucketData | null> {
  if (!ENV.exportBaseUrl) return null;
  const { data } = await http.get(`${ENV.exportBaseUrl}/v1/sensors/${type}/aggregate`, {
    params: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      bucket: "auto",
    },
  });
  return data as AggregateBucketData;
}
