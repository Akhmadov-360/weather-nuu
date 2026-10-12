import type { Condition, Weather } from './weather';

const CONDITIONS: readonly Condition[] = ['clear', 'clouds', 'fog', 'drizzle', 'rain', 'shower', 'sleet', 'snow', 'blizzard', 'hail', 'thunder'];

/** `?weather=rain` in development: a made-up weather to review every scene without waiting for the sky to cooperate. */
export function weatherFromParam(value: string | null): Weather | null {
  if (!value || !CONDITIONS.includes(value as Condition)) return null;
  const condition = value as Condition;
  const cold = condition === 'snow' || condition === 'blizzard' || condition === 'sleet';
  return {
    condition,
    temp: cold ? -3 : 18,
    intensity: condition === 'clear' || condition === 'clouds' ? 0 : 0.7,
    cloud: condition === 'clear' ? 0.05 : 0.7,
    windX: 30,
    isDay: true,
  };
}

/** `?date=2026-12-31` in development: noon at the station on that day, to review seasons and holidays. */
export function dateFromParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T07:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
