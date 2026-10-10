import { STATION } from '@/shared/config/station';

const MINUTE_MS = 60_000;

/** Hours and minutes on the station's wall clock (not the visitor's). */
export function stationClock(ms: number): { hours: number; minutes: number } {
  const local = new Date(ms + STATION.utcOffsetMinutes * MINUTE_MS);
  return { hours: local.getUTCHours(), minutes: local.getUTCMinutes() };
}

/** "HH:MM" on the station's clock. */
export function formatStationTime(ms: number): string {
  const { hours, minutes } = stationClock(ms);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

const UZ_WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

/**
 * "суббота, 10 октября" on the station's calendar. Uzbek is written out here
 * because browsers ship no Uzbek (Latin) date names and fall back to "M10 10, Sat".
 */
export function formatStationDate(ms: number, language: string): string {
  if (language.startsWith('uz')) {
    const local = new Date(ms + STATION.utcOffsetMinutes * MINUTE_MS);
    return `${UZ_WEEKDAYS[local.getUTCDay()]}, ${local.getUTCDate()} ${UZ_MONTHS[local.getUTCMonth()]}`;
  }
  return new Intl.DateTimeFormat(language, {
    timeZone: STATION.timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(ms);
}

/**
 * Review aid for development builds: `?time=18:20` pins the card to that time
 * of the station's current day so every phase of the sky can be looked at.
 * Returns undefined for anything that is not a valid HH:MM.
 */
export function previewNow(param: string | null, nowMs: number): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(param ?? '');
  if (!m) return undefined;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return undefined;
  const local = new Date(nowMs + STATION.utcOffsetMinutes * MINUTE_MS);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hours, minutes) - STATION.utcOffsetMinutes * MINUTE_MS;
}
