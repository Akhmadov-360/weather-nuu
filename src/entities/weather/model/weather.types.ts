import type { WeatherPageType } from '@/shared/types/common';

export type SensorType = 'temp' | 'hum' | 'press' | 'mq5' | 'mq3' | 'pm25' | 'pm10';

/** Sensors that have a fixed zone scale in SENSOR_RANGES (dust uses the air-quality standard instead). */
export type ScaleSensor = Exclude<SensorType, 'pm25' | 'pm10'>;

export function isScaleSensor(sensor: SensorType): sensor is ScaleSensor {
  return sensor !== 'pm25' && sensor !== 'pm10';
}

/**
 * What each source physically has. Only the Room device carries the dust
 * sensor (Plantower PMS); Street's readings never include dust, so its
 * charts and cards must not offer it.
 */
export const SENSORS_BY_SOURCE: Record<'room' | 'street', SensorType[]> = {
  room: ['temp', 'hum', 'press', 'pm25', 'pm10', 'mq5', 'mq3'],
  street: ['temp', 'hum', 'press', 'mq5', 'mq3'],
};

export type WeatherLatest = {
  temp: number;
  hum: number;
  press: number;
  mq5: number;
  mq3: number;
  /** Dust in µg/m³. `null` means no reading (no sensor on Street, or a failed read), never zero dust. */
  pm25: number | null;
  pm10: number | null;
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
  /** Absent when talking to a backend that predates the dust fields. */
  pm25?: MetricStats;
  pm10?: MetricStats;
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
