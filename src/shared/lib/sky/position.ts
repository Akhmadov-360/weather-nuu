import { getMoonIllumination, getTimes, type SunTimes } from 'suncalc';
import { phaseAt, type DayPhase, type PhaseTimes } from './phase';

export type SkyState = {
  phase: DayPhase;
  /** Today's sunrise and sunset (ms), for the labels under the arc. */
  sunrise: number;
  sunset: number;
  /** The body that is up: the sun between sunrise and sunset, the moon otherwise. */
  luminary: 'sun' | 'moon';
  /** Where the arc of that body starts and ends (ms): sunrise..sunset for the sun, sunset..next sunrise for the moon. */
  arcStart: number;
  arcEnd: number;
  /** Position along the arc of that body, 0 (rising) to 1 (setting). */
  progress: number;
  /** Moon phase, 0 new, 0.5 full, 1 new again (see suncalc). */
  moonPhase: number;
};

const DAY_MS = 86_400_000;
const ms = (d: Date | null | undefined): number => (d ? d.getTime() : Number.NaN);

function usable(t: SunTimes): boolean {
  return [t.dawn, t.sunrise, t.goldenHourEnd, t.goldenHour, t.sunset, t.dusk].every((d) => Number.isFinite(ms(d)));
}

/**
 * Where the sun or moon is on its arc and which phase of the day it is, for a
 * place and a moment. `utcOffsetMinutes` is the zone of the place, so "the
 * day" is its civil day. Returns null when the sun does not rise or set that
 * day (polar regions) or the times are otherwise not finite; callers then
 * show the time without the sky.
 */
export function skyState(nowMs: number, lat: number, lon: number, utcOffsetMinutes = 0): SkyState | null {
  const now = new Date(nowMs);
  const today = getTimes(now, lat, lon, 0, utcOffsetMinutes);
  if (!usable(today)) return null;

  const phaseTimes: PhaseTimes = {
    dawn: ms(today.dawn),
    sunrise: ms(today.sunrise),
    goldenHourEnd: ms(today.goldenHourEnd),
    goldenHour: ms(today.goldenHour),
    sunset: ms(today.sunset),
    dusk: ms(today.dusk),
  };
  const { sunrise, sunset } = phaseTimes;

  let luminary: 'sun' | 'moon';
  let from: number;
  let to: number;
  if (nowMs >= sunrise && nowMs < sunset) {
    luminary = 'sun';
    from = sunrise;
    to = sunset;
  } else if (nowMs >= sunset) {
    const tomorrow = getTimes(new Date(nowMs + DAY_MS), lat, lon, 0, utcOffsetMinutes);
    luminary = 'moon';
    from = sunset;
    to = ms(tomorrow.sunrise);
  } else {
    const yesterday = getTimes(new Date(nowMs - DAY_MS), lat, lon, 0, utcOffsetMinutes);
    luminary = 'moon';
    from = ms(yesterday.sunset);
    to = sunrise;
  }
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;

  return {
    phase: phaseAt(nowMs, phaseTimes),
    sunrise,
    sunset,
    luminary,
    arcStart: from,
    arcEnd: to,
    progress: Math.min(1, Math.max(0, (nowMs - from) / (to - from))),
    moonPhase: getMoonIllumination(now).phase,
  };
}
