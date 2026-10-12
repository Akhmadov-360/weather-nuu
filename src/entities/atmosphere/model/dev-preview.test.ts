import { describe, expect, it } from 'vitest';
import { dateFromParam, weatherFromParam } from './dev-preview';

describe('weatherFromParam', () => {
  it('builds a weather for a known condition', () => {
    expect(weatherFromParam('rain')?.condition).toBe('rain');
    expect(weatherFromParam('snow')?.temp).toBeLessThan(0);
    expect(weatherFromParam('clear')?.intensity).toBe(0);
  });

  it('ignores unknown values', () => {
    expect(weatherFromParam('lava')).toBeNull();
    expect(weatherFromParam(null)).toBeNull();
    expect(weatherFromParam('')).toBeNull();
  });
});

describe('dateFromParam', () => {
  it('reads a calendar date as noon at the station', () => {
    expect(dateFromParam('2026-12-31')?.toISOString()).toBe('2026-12-31T07:00:00.000Z');
  });

  it('ignores anything else', () => {
    expect(dateFromParam('31.12.2026')).toBeNull();
    expect(dateFromParam('2026-13-45')).toBeNull();
    expect(dateFromParam(null)).toBeNull();
  });
});
