import { DEFAULT_STANDARD_ID, aqi, categorize, getStandard, type CategoryId, type Pollutant } from '@/shared/lib/air-quality';
import { hasEnoughDayCoverage, recentMean, type DustField } from './dust';
import { SENSORS_BY_SOURCE, type WeatherHistoryItem } from './weather.types';

export type DustReading = { mean: number; aqi: number | null; category: CategoryId | null };

export type DustCardModel =
  | { kind: 'no_sensor' }
  | { kind: 'no_data'; lastSeen: string | null }
  | { kind: 'ready'; pm25: DustReading; pm10: DustReading | null; day: DustReading | null; windowPoints: number };

type Input = {
  source: 'room' | 'street';
  history: WeatherHistoryItem[];
  /** 24 h PM2.5 mean from the aggregate query; null/undefined while loading, failed or empty. */
  dayMean: { mean: number; coverage: number } | null | undefined;
  nowMs?: number;
};

function reading(pollutant: Pollutant, mean: number): DustReading {
  const standard = getStandard(DEFAULT_STANDARD_ID);
  return { mean, aqi: aqi(standard, pollutant, mean), category: categorize(standard, pollutant, mean) };
}

function lastSeen(history: WeatherHistoryItem[], field: DustField): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const v = history[i]![field];
    if (typeof v === 'number' && Number.isFinite(v)) return history[i]!.date;
  }
  return null;
}

/** Decides which of the card's states applies and prepares the numbers; the component only renders it. */
export function buildDustCardModel({ source, history, dayMean, nowMs = Date.now() }: Input): DustCardModel {
  if (!SENSORS_BY_SOURCE[source].includes('pm25')) return { kind: 'no_sensor' };

  const now25 = recentMean(history, 'pm25', nowMs);
  if (!now25) return { kind: 'no_data', lastSeen: lastSeen(history, 'pm25') };

  const now10 = recentMean(history, 'pm10', nowMs);
  return {
    kind: 'ready',
    pm25: reading('pm25', now25.mean),
    pm10: now10 ? reading('pm10', now10.mean) : null,
    day: dayMean && hasEnoughDayCoverage(dayMean.coverage) ? reading('pm25', dayMean.mean) : null,
    windowPoints: now25.count,
  };
}
