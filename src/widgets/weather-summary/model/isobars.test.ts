import { describe, expect, it } from 'vitest';
import { isobarRings } from './isobars';

describe('isobarRings', () => {
  it('draws a ring every 10 hPa from 940 to 1040, higher pressure nearer the centre', () => {
    const { rings } = isobarRings(980, null);
    expect(rings.map((r) => r.level)).toEqual([940, 950, 960, 970, 980, 990, 1000, 1010, 1020, 1030, 1040]);
    expect(rings[0]!.r).toBe(150);
    expect(rings[10]!.r).toBe(36);
    for (let i = 1; i < rings.length; i++) expect(rings[i]!.r).toBeLessThan(rings[i - 1]!.r);
  });

  it('labels every second ring', () => {
    const { rings } = isobarRings(980, null);
    expect(rings.filter((r) => r.labelled).map((r) => r.level)).toEqual([940, 960, 980, 1000, 1020, 1040]);
  });

  it('puts the current value on its ring', () => {
    const { current } = isobarRings(960, null);
    expect(current.level).toBe(960);
    expect(current.r).toBeCloseTo(127.2, 5);
    expect(current.clamped).toBe(false);
  });

  it('keeps values outside the range on the nearest ring and says so', () => {
    expect(isobarRings(930, null).current).toMatchObject({ level: 940, r: 150, clamped: true });
    expect(isobarRings(1050, null).current).toMatchObject({ level: 1040, r: 36, clamped: true });
  });

  it('marks where the pressure was three hours ago', () => {
    expect(isobarRings(962, null).previous).toBeNull();
    const p = isobarRings(962, 4).previous!;
    expect(p.level).toBe(958);
    expect(p.r).toBeGreaterThan(isobarRings(962, null).current.r);
  });
});
