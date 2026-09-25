import type { WeatherPageType } from '@/shared/types/common';

export type SensorType = 'temp' | 'hum' | 'press' | 'mq5' | 'mq3';

export type WeatherLatest = {
  temp: number;
  hum: number;
  press: number;
  mq5: number;
  mq3: number;
  date: string;
};

export type WeatherHistoryItem = WeatherLatest;

/**
 * One bucket of the /v1/sensors/:source/aggregate response. Mirrors the
 * Zod schema in @weather/contracts (schemas/aggregate.ts) — kept as a
 * plain client type instead of importing the backend package so the
 * frontend build stays independent, but the shape must stay in sync.
 */
export type MetricStats = { avg: number | null; min: number | null; max: number | null };
export type AggregateBucketRow = {
  ts: string;
  count: number;
  temp:  MetricStats;
  hum:   MetricStats;
  press: MetricStats;
  mq5:   MetricStats;
  mq3:   MetricStats;
};
export type AggregateBucketData = {
  source: 'room' | 'street';
  /** Resolved bucket width, e.g. "1h" — server picks it when auto is requested. */
  bucket: '1m' | '5m' | '15m' | '1h' | '3h' | '1d' | '3d';
  from: string;
  to: string;
  items: AggregateBucketRow[];
};

export type WeatherApiPaths = {
  latest: string;
  history: string;
};

export type DashboardPageConfig = {
  key: WeatherPageType;
  titleKey: string;
  navKey: string;
  oppositeNavKey: string;
  oppositePath: string;
  api: WeatherApiPaths;
};
