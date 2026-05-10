import type { WeatherHistoryItem } from '@/entities/weather/model/weather.types';

export type TimeRange = '1h' | '6h' | '24h' | '7d' | 'all';

const RANGE_MS: Record<Exclude<TimeRange, 'all'>, number> = {
  '1h':  60 * 60_000,
  '6h':  6  * 60 * 60_000,
  '24h': 24 * 60 * 60_000,
  '7d':  7  * 24 * 60 * 60_000,
};

/*
 * Минимальный валидный timestamp.
 * Данные до 2020 — результат бага прошивки сенсора:
 * Unix timestamp в секундах интерпретируется как миллисекунды,
 * что даёт даты вида 2001-10-05 (31 557 600 секунд ≈ 2001 год).
 */
export const MIN_VALID_TS = new Date('2020-01-01T00:00:00Z').getTime();

export function isValidTimestamp(dateStr: string): boolean {
  const ts = new Date(dateStr).getTime();
  return !Number.isNaN(ts) && ts >= MIN_VALID_TS;
}

export function filterByTimeRange(
  history: WeatherHistoryItem[],
  range: TimeRange,
): WeatherHistoryItem[] {
  // Сначала убираем записи с заведомо некорректными датами
  const valid = history.filter((item) => isValidTimestamp(item.date));
  if (!valid.length) return [];
  if (range === 'all') return valid;

  /*
   * Точка отсчёта — МАКСИМАЛЬНЫЙ валидный timestamp в данных,
   * а не последний элемент массива (он может быть из 2001).
   * Это позволяет "24ч" всегда показывать последние 24ч доступных данных.
   */
  let reference = 0;
  for (const item of valid) {
    const ts = new Date(item.date).getTime();
    if (ts > reference) reference = ts;
  }

  const cutoff = reference - RANGE_MS[range as Exclude<TimeRange, 'all'>];
  return valid.filter((item) => new Date(item.date).getTime() >= cutoff);
}
