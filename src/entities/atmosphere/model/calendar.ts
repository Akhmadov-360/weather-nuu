export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
export type EventId = 'navruz' | 'independence' | 'new_year' | 'constitution' | 'teachers';

type MonthDay = readonly [month: number, day: number];

/** Inclusive windows in the station's time zone; the New Year window wraps over the turn of the year. */
export const EVENT_WINDOWS: readonly { id: EventId; from: MonthDay; to: MonthDay }[] = [
  { id: 'navruz', from: [3, 20], to: [3, 23] },
  { id: 'independence', from: [8, 31], to: [9, 1] },
  { id: 'teachers', from: [10, 1], to: [10, 1] },
  { id: 'constitution', from: [12, 7], to: [12, 8] },
  { id: 'new_year', from: [12, 25], to: [1, 7] },
];

const key = ([month, day]: MonthDay) => month * 100 + day;

function inWindow(today: number, from: MonthDay, to: MonthDay): boolean {
  const start = key(from);
  const end = key(to);
  return start <= end ? today >= start && today <= end : today >= start || today <= end;
}

function seasonOf(month: number): Season {
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

/** The season and the holiday (if any) on this date at the station, not at the visitor. */
export function sceneFor(date: Date, tz: string): { season: Season; event: EventId | null } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: 'numeric', day: 'numeric' }).formatToParts(date);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const today = month * 100 + day;
  const event = EVENT_WINDOWS.find((w) => inWindow(today, w.from, w.to))?.id ?? null;
  return { season: seasonOf(month), event };
}
