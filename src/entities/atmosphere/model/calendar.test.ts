import { describe, expect, it } from 'vitest';
import { sceneFor } from './calendar';

const TZ = 'Asia/Tashkent';
/** Noon in Tashkent on the given date (UTC+5), so the local day is unambiguous. */
const at = (iso: string) => new Date(`${iso}T07:00:00Z`);

describe('sceneFor: events', () => {
  it.each([
    ['2026-03-19', null],
    ['2026-03-20', 'navruz'],
    ['2026-03-23', 'navruz'],
    ['2026-03-24', null],
    ['2026-08-30', null],
    ['2026-08-31', 'independence'],
    ['2026-09-01', 'independence'],
    ['2026-09-02', null],
    ['2026-10-01', 'teachers'],
    ['2026-12-07', 'constitution'],
    ['2026-12-08', 'constitution'],
    ['2026-12-09', null],
    ['2026-12-24', null],
    ['2026-12-25', 'new_year'],
    ['2026-12-31', 'new_year'],
    ['2027-01-01', 'new_year'],
    ['2027-01-07', 'new_year'],
    ['2027-01-08', null],
  ])('%s is %s', (day, event) => {
    expect(sceneFor(at(day), TZ).event).toBe(event);
  });
});

describe('sceneFor: seasons', () => {
  it.each([
    ['2026-02-28', 'winter'],
    ['2028-02-29', 'winter'],
    ['2026-03-01', 'spring'],
    ['2026-05-31', 'spring'],
    ['2026-06-01', 'summer'],
    ['2026-08-31', 'summer'],
    ['2026-09-01', 'autumn'],
    ['2026-11-30', 'autumn'],
    ['2026-12-01', 'winter'],
  ])('%s is %s', (day, season) => {
    expect(sceneFor(at(day), TZ).season).toBe(season);
  });
});

describe('sceneFor: time zone', () => {
  it('reads the date at the station, not at the visitor', () => {
    // 20:00 UTC on 31 Dec is already 01:00 on 1 Jan in Tashkent.
    const scene = sceneFor(new Date('2026-12-31T20:00:00Z'), TZ);
    expect(scene).toEqual({ season: 'winter', event: 'new_year' });
    // The same instant in New York is still 31 December: still New Year's window, but a different day boundary case below.
    expect(sceneFor(new Date('2026-03-19T20:00:00Z'), TZ).event).toBe('navruz');
    expect(sceneFor(new Date('2026-03-19T20:00:00Z'), 'America/New_York').event).toBeNull();
  });
});
