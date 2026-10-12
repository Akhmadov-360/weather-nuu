export type Condition =
  | 'clear'
  | 'clouds'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'shower'
  | 'sleet'
  | 'snow'
  | 'blizzard'
  | 'hail'
  | 'thunder';

export type Weather = {
  condition: Condition;
  /** °C, temperature_2m. */
  temp: number;
  /** 0..1 */
  intensity: number;
  /** 0..1 */
  cloud: number;
  /** px/s, the sign is the direction (positive blows to the right). */
  windX: number;
  isDay: boolean;
};

/** When several conditions could apply, the one earlier in the list wins. */
export const CONDITION_PRIORITY: readonly Condition[] = [
  'thunder',
  'hail',
  'blizzard',
  'snow',
  'sleet',
  'shower',
  'rain',
  'drizzle',
  'fog',
  'clouds',
  'clear',
];

const MAX_WIND_PX = 150;
const WIND_PX_PER_KMH = 1.5;

/** Base density of each condition before the measured precipitation is mixed in. */
const BASE_INTENSITY: Partial<Record<Condition, number>> = {
  fog: 0.5,
  drizzle: 0.25,
  rain: 0.6,
  shower: 0.85,
  sleet: 0.5,
  snow: 0.5,
  blizzard: 0.9,
  hail: 0.8,
  thunder: 0.9,
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function conditionFor(code: number): Condition {
  if (code === 0) return 'clear';
  if (code >= 1 && code <= 3) return 'clouds';
  if (code === 45 || code === 48) return 'fog';
  if (code === 56 || code === 57 || code === 66 || code === 67) return 'sleet';
  if (code >= 51 && code <= 55) return 'drizzle';
  if (code >= 61 && code <= 65) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'shower';
  if (code === 85 || code === 86) return 'blizzard';
  if (code === 95) return 'thunder';
  if (code === 96 || code === 99) return 'hail';
  return 'clear';
}

/** Liquid precipitation falls as snow or sleet when it is cold enough. */
function adjustForCold(condition: Condition, temp: number): Condition {
  if (condition !== 'drizzle' && condition !== 'rain' && condition !== 'shower') return condition;
  if (temp <= -2) return 'snow';
  if (temp <= 0) return 'sleet';
  return condition;
}

/** Open-Meteo's `current` block turned into what the scene needs. */
export function describeWeather(
  code: number,
  temp: number,
  input: { precipitation: number; cloud: number; windKmh: number; windDirDeg: number; isDay: boolean },
): Weather {
  const condition = adjustForCold(conditionFor(code), temp);
  const base = BASE_INTENSITY[condition];
  const intensity = base === undefined ? 0 : clamp(Math.max(base * 0.5, Math.min(1, input.precipitation / 6)), 0.15, 1);
  // Meteorological direction is where the wind comes FROM; particles are pushed the opposite way.
  const windX = clamp(-Math.sin((input.windDirDeg * Math.PI) / 180) * input.windKmh * WIND_PX_PER_KMH, -MAX_WIND_PX, MAX_WIND_PX);
  return { condition, temp, intensity, cloud: clamp(input.cloud / 100, 0, 1), windX, isDay: input.isDay };
}

/**
 * The temperature the scene should believe: our own sensor while it reports,
 * otherwise the weather service, otherwise none (so heat and frost effects
 * simply stay off). A silent sensor must not switch an effect off.
 */
export function effectiveTemperature(streetTemp: number | null, weather: Weather | null): number | null {
  if (streetTemp !== null && Number.isFinite(streetTemp)) return streetTemp;
  if (weather && Number.isFinite(weather.temp)) return weather.temp;
  return null;
}
