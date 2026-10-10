import { describe, expect, it } from 'vitest';
import { buildZoneGradient, getZoneBgClass } from './sensor-format';
import { SENSOR_RANGES } from './weather-ranges';

describe('SENSOR_RANGES', () => {
  it('every zone colour has a background class and a gradient colour', () => {
    for (const [sensor, range] of Object.entries(SENSOR_RANGES)) {
      for (const zone of range.zones) {
        expect(getZoneBgClass(zone.color), `${sensor} ${zone.labelKey}`).toBeTruthy();
      }
      expect(buildZoneGradient(range), sensor).not.toContain('undefined');
    }
  });

  it('MQ-3 is one gray reference zone in ppm up to 500', () => {
    const mq3 = SENSOR_RANGES.mq3;
    expect(mq3.unit).toBe('ppm');
    expect(mq3.max).toBe(500);
    expect(mq3.zones).toEqual([{ from: 0, to: 500, color: 'gray', labelKey: 'range_mq3_ref' }]);
  });

  it('MQ-5 keeps its 0-1000 / 1000-2000 / 2000+ ppm zones', () => {
    const mq5 = SENSOR_RANGES.mq5;
    expect(mq5.unit).toBe('ppm');
    expect(mq5.max).toBe(3000);
    expect(mq5.zones.map((z) => [z.from, z.to])).toEqual([[0, 1000], [1000, 2000], [2000, 3000]]);
  });
});
