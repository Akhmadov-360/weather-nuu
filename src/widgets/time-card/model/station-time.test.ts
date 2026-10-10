import { describe, expect, it } from 'vitest';
import { formatStationDate, formatStationTime, previewNow, stationClock } from './station-time';

// 2026-10-10 12:00 UTC is 17:00 in Tashkent (UTC+5)
const NOON_UTC = Date.UTC(2026, 9, 10, 12, 0);

describe('stationClock', () => {
  it('shows the station wall clock, whatever zone the visitor is in', () => {
    expect(stationClock(NOON_UTC)).toEqual({ hours: 17, minutes: 0 });
    expect(formatStationTime(Date.UTC(2026, 9, 10, 18, 7))).toBe('23:07');
  });

  it('rolls over midnight into the next day', () => {
    expect(formatStationTime(Date.UTC(2026, 9, 10, 19, 5))).toBe('00:05');
  });
});

describe('formatStationDate', () => {
  // 2026-10-10 is a Saturday
  const ms = Date.UTC(2026, 9, 10, 12, 0);

  it('writes the Uzbek (Latin) date with its own names: the browser has no data for them', () => {
    expect(formatStationDate(ms, 'uz')).toBe('shanba, 10 oktabr');
  });

  it('uses the station day, not the visitor day', () => {
    // 20:00 UTC on the 10th is already 01:00 on the 11th (Sunday) in Tashkent
    expect(formatStationDate(Date.UTC(2026, 9, 10, 20, 0), 'uz')).toBe('yakshanba, 11 oktabr');
  });

  it('formats Russian and English through Intl', () => {
    expect(formatStationDate(ms, 'ru')).toBe('суббота, 10 октября');
    expect(formatStationDate(ms, 'en')).toBe('Saturday, October 10');
  });
});

describe('previewNow', () => {
  it('pins the time of the station day', () => {
    const ms = previewNow('06:30', NOON_UTC)!;
    expect(formatStationTime(ms)).toBe('06:30');
    expect(new Date(ms + 5 * 3_600_000).getUTCDate()).toBe(10);
  });

  it.each([null, '', 'abc', '24:00', '12:60', '1230'])('ignores %s', (value) => {
    expect(previewNow(value, NOON_UTC)).toBeUndefined();
  });
});
