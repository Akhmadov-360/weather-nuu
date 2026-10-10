import { describe, expect, it } from 'vitest';
import { US_EPA_2024 } from './standards/us-epa-2024';
import { chartThresholds, zoneStops } from './zones';

describe('zoneStops', () => {
  it('splits a 0..150 PM2.5 bar into the categories that fit, contiguous and clipped to 100%', () => {
    const stops = zoneStops(US_EPA_2024, 'pm25', 150);
    expect(stops.map((s) => s.category)).toEqual([
      'good',
      'moderate',
      'unhealthy_sensitive',
      'unhealthy',
      'very_unhealthy',
    ]);
    expect(stops[0]!.fromPct).toBe(0);
    expect(stops[stops.length - 1]!.toPct).toBe(100);
    for (let i = 1; i < stops.length; i++) expect(stops[i]!.fromPct).toBe(stops[i - 1]!.toPct);
    expect(stops[0]!.toPct).toBeCloseTo(6, 5);
  });

  it('drops categories that start beyond the bar', () => {
    const stops = zoneStops(US_EPA_2024, 'pm25', 20);
    expect(stops.map((s) => s.category)).toEqual(['good', 'moderate']);
    expect(stops[1]!.toPct).toBe(100);
  });
});

describe('chartThresholds', () => {
  it('lists the boundaries between categories for PM2.5', () => {
    expect(chartThresholds(US_EPA_2024, 'pm25').map((t) => t.value)).toEqual([9, 35.4, 55.4, 125.4, 225.4]);
  });

  it('lists the boundaries between categories for PM10', () => {
    const t = chartThresholds(US_EPA_2024, 'pm10');
    expect(t.map((x) => x.value)).toEqual([54, 154, 254, 354, 424]);
    expect(t[0]!.category).toBe('good');
  });
});
