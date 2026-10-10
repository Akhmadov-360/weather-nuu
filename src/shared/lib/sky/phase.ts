export type DayPhase = 'night' | 'dawn' | 'morning' | 'day' | 'evening' | 'dusk';

/** Moments (ms) of one civil day taken from the sun times; `suncalc` names in brackets. */
export type PhaseTimes = {
  dawn: number; // civil dawn begins [dawn]
  sunrise: number; // [sunrise]
  goldenHourEnd: number; // morning golden hour ends [goldenHourEnd]
  goldenHour: number; // evening golden hour begins [goldenHour]
  sunset: number; // [sunset]
  dusk: number; // civil dusk ends [dusk]
};

/** Phase of the day at `now`; everything before dawn and from dusk on is night. */
export function phaseAt(now: number, t: PhaseTimes): DayPhase {
  if (now < t.dawn || now >= t.dusk) return 'night';
  if (now < t.sunrise) return 'dawn';
  if (now < t.goldenHourEnd) return 'morning';
  if (now < t.goldenHour) return 'day';
  if (now < t.sunset) return 'evening';
  return 'dusk';
}
