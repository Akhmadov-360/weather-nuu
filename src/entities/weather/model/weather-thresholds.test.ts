import { describe, expect, it } from 'vitest';
import { SENSOR_RANGES } from '@/shared/lib/weather-ranges';
import { getSensorStatus, getTempDeltaFromNorm } from './weather-thresholds';

describe('getSensorStatus: temperature (norm 20-24 °C)', () => {
  it.each([
    [19.9, 'status_below_norm', 'warn'],
    [20, 'status_normal', 'good'],
    [22, 'status_normal', 'good'],
    [24, 'status_normal', 'good'],
    [24.1, 'status_above_norm', 'warn'],
  ] as const)('%s °C → %s / %s', (value, labelKey, tone) => {
    expect(getSensorStatus('temp', value)).toEqual({ labelKey, tone });
  });
});

describe('getSensorStatus: humidity (norm 30-60 %)', () => {
  it.each([
    [29.9, 'status_low', 'warn'],
    [30, 'status_normal', 'good'],
    [60, 'status_normal', 'good'],
    [60.1, 'status_high', 'warn'],
  ] as const)('%s %% → %s / %s', (value, labelKey, tone) => {
    expect(getSensorStatus('hum', value)).toEqual({ labelKey, tone });
  });
});

describe('getSensorStatus: pressure and missing values', () => {
  it('shows pressure as reference only, whatever the value', () => {
    expect(getSensorStatus('press', 500)).toEqual({ labelKey: 'status_reference', tone: 'neutral' });
    expect(getSensorStatus('press', 962)).toEqual({ labelKey: 'status_reference', tone: 'neutral' });
  });

  it.each([null, Number.NaN])('treats %s as unknown', (value) => {
    expect(getSensorStatus('temp', value)).toEqual({ labelKey: 'status_reference', tone: 'neutral' });
  });
});

describe('getSensorStatus: gas sensors follow SENSOR_RANGES zones', () => {
  // The badge and the slider zones must never disagree: both come from SENSOR_RANGES.
  it.each(['mq5', 'mq3'] as const)('%s: badge changes exactly at the zone boundaries', (sensor) => {
    const [safe, warn] = SENSOR_RANGES[sensor].zones;

    expect(getSensorStatus(sensor, safe!.from).tone).toBe('good');
    expect(getSensorStatus(sensor, safe!.to).tone).toBe('good');
    expect(getSensorStatus(sensor, safe!.to + 0.1).tone).toBe('warn');
    expect(getSensorStatus(sensor, warn!.to).tone).toBe('warn');
    expect(getSensorStatus(sensor, warn!.to + 0.1).tone).toBe('bad');
  });

  it('returns the matching label keys', () => {
    expect(getSensorStatus('mq5', 0).labelKey).toBe('status_safe');
    expect(getSensorStatus('mq5', 1500).labelKey).toBe('status_warning');
    expect(getSensorStatus('mq5', 2500).labelKey).toBe('status_high');
  });
});

describe('getTempDeltaFromNorm', () => {
  it.each([
    [22, 0],
    [20, 0],
    [24, 0],
    [18, 2],
    [26.5, 2.5],
  ])('%s °C → %s', (value, expected) => {
    expect(getTempDeltaFromNorm(value)).toBe(expected);
  });

  it('rounds to two decimals', () => {
    expect(getTempDeltaFromNorm(19.333)).toBe(0.67);
  });

  it('returns null for unknown values', () => {
    expect(getTempDeltaFromNorm(null)).toBeNull();
    expect(getTempDeltaFromNorm(Number.NaN)).toBeNull();
  });
});
