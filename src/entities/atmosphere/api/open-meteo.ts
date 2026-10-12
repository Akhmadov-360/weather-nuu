import { STATION } from '@/shared/config/station';
import { describeWeather, type Weather } from '../model/weather';

const CURRENT_FIELDS = [
  'weather_code',
  'temperature_2m',
  'precipitation',
  'cloud_cover',
  'wind_speed_10m',
  'wind_direction_10m',
  'is_day',
] as const;

/** Open-Meteo needs no key; one request per visitor per 15 minutes is far below its free limits. */
export function buildOpenMeteoUrl(): string {
  const params = new URLSearchParams({
    latitude: String(STATION.lat),
    longitude: String(STATION.lon),
    current: CURRENT_FIELDS.join(','),
    timezone: STATION.timeZone,
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

/** The response's `current` block as a Weather, or null if anything we rely on is missing or not a number. */
export function mapOpenMeteo(raw: unknown): Weather | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const current = (raw as { current?: unknown }).current;
  if (typeof current !== 'object' || current === null) return null;
  const c = current as Record<string, unknown>;
  const num = (key: (typeof CURRENT_FIELDS)[number]) => (typeof c[key] === 'number' && Number.isFinite(c[key]) ? (c[key] as number) : null);

  const code = num('weather_code');
  const temp = num('temperature_2m');
  const precipitation = num('precipitation');
  const cloud = num('cloud_cover');
  const windKmh = num('wind_speed_10m');
  const windDirDeg = num('wind_direction_10m');
  const isDay = num('is_day');
  if ([code, temp, precipitation, cloud, windKmh, windDirDeg, isDay].some((v) => v === null)) return null;

  return describeWeather(code!, temp!, {
    precipitation: precipitation!,
    cloud: cloud!,
    windKmh: windKmh!,
    windDirDeg: windDirDeg!,
    isDay: isDay === 1,
  });
}
