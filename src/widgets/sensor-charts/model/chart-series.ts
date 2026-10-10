import type { AggregateBucketRow, SensorType, WeatherHistoryItem } from '@/entities/weather/model/weather.types';
import { isScaleSensor } from '@/entities/weather/model/weather.types';
import { DEFAULT_STANDARD_ID, chartThresholds, getStandard } from '@/shared/lib/air-quality';
import { isValidTimestamp } from '@/shared/lib/date/filter-by-range';
import { SENSOR_RANGES } from '@/shared/lib/weather-ranges';

export type Point = [number, number | null];

/** Guide lines at the zone boundaries: SENSOR_RANGES for scale sensors, the air-quality standard for dust. */
export function thresholdValues(sensor: SensorType): number[] {
  if (isScaleSensor(sensor)) return SENSOR_RANGES[sensor].zones.slice(0, -1).map((zone) => zone.to);
  return chartThresholds(getStandard(DEFAULT_STANDARD_ID), sensor).map((th) => th.value);
}

/*
 * Адаптивный formatter оси X.
 * Ключевое: проверяем не только длительность диапазона (spanMs),
 * но и пересечение календарных дней — данные могут быть < 24ч
 * но охватывать два дня (напр. 9 мая 17:00 → 10 мая 10:00).
 * В этом случае метки без даты ("17:00", "10:00") непонятны.
 */
export function makeAxisFormatter(firstTs: number, lastTs: number) {
  const DAY = 86_400_000;
  const spanMs = lastTs - firstTs;

  const firstDate = new Date(firstTs);
  const lastDate = new Date(lastTs);
  const crossesDay =
    firstDate.getDate() !== lastDate.getDate() ||
    firstDate.getMonth() !== lastDate.getMonth() ||
    firstDate.getFullYear() !== lastDate.getFullYear();

  return (val: number) => {
    const d = new Date(val);
    const hh = d.getHours().toString().padStart(2, '0');
    const mn = d.getMinutes().toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    const mo = (d.getMonth() + 1).toString().padStart(2, '0');

    if (spanMs > DAY * 7) return `${dd}.${mo}`; // > 7 дней → только дата
    if (spanMs > DAY || crossesDay) return `${dd}.${mo}\n${hh}:${mn}`; // > 1 дня или разные дни → дата + время
    return `${hh}:${mn}`; // внутри одного дня → только время
  };
}

export function formatTooltipTs(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

/** Min/max/average of the plotted values, the latest value and the direction of the last step. */
export function summarize(values: number[]): {
  min: number | null;
  max: number | null;
  avg: number | null;
  current: number | null;
  trend: 'up' | 'down' | 'stable';
} {
  if (!values.length) return { min: null, max: null, avg: null, current: null, trend: 'stable' };
  let lo = values[0]!;
  let hi = values[0]!;
  let sum = 0;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
    sum += v;
  }
  const current = values.at(-1) ?? null;
  const prev = values.at(-2) ?? null;
  const trend =
    current != null && prev != null ? (current > prev ? 'up' : current < prev ? 'down' : 'stable') : 'stable';
  return { min: lo, max: hi, avg: sum / values.length, current, trend };
}

/** Aggregate mode: avg line plus the (min, max - min) pair that draws the shaded band. */
export function aggregateSeries(items: AggregateBucketRow[], sensor: SensorType) {
  const rows = items.filter((r) => r.count > 0);
  const avg: Point[] = [];
  const min: Point[] = [];
  const range: Point[] = []; // (max - min), stacked on min to draw the band
  for (const r of rows) {
    const ts = new Date(r.ts).getTime();
    // Dust stats are absent on a backend that predates the dust fields: leave a gap instead of crashing.
    const stats = r[sensor];
    avg.push([ts, stats?.avg ?? null]);
    min.push([ts, stats?.min ?? null]);
    range.push([ts, stats?.min != null && stats.max != null ? stats.max - stats.min : null]);
  }
  return { rows, avg, min, range };
}

/** Raw mode: every reading with a sane timestamp; a failed read stays as a null gap. */
export function rawSeries(history: WeatherHistoryItem[], sensor: SensorType): Point[] {
  return history
    .filter((item) => isValidTimestamp(item.date))
    .map((item) => [new Date(item.date).getTime(), item[sensor] ?? null] as Point);
}
