import { describe, expect, it } from 'vitest';
import en from './en/common.json';
import ru from './ru/common.json';
import uz from './uz/common.json';

const LOCALES: Record<string, Record<string, string>> = { ru, uz, en };

const REQUIRED_KEYS = [
  'aqi_cat_good',
  'aqi_cat_moderate',
  'aqi_cat_unhealthy_sensitive',
  'aqi_cat_unhealthy',
  'aqi_cat_very_unhealthy',
  'aqi_cat_hazardous',
  'btn_pm25',
  'btn_pm10',
  'btn_pm25_short',
  'btn_pm10_short',
  'lbl_pm25',
  'lbl_pm10',
  'standard_us_epa_2024',
  'range_mq3_ref',
];

describe('locales', () => {
  it('ru, uz and en have identical key sets', () => {
    const keys = (l: Record<string, string>) => Object.keys(l).sort();
    expect(keys(uz)).toEqual(keys(ru));
    expect(keys(en)).toEqual(keys(ru));
  });

  it.each(Object.keys(LOCALES))('%s has every key the air-quality logic needs, non-empty', (name) => {
    for (const key of REQUIRED_KEYS) {
      expect(LOCALES[name]![key], `${name}:${key}`).toBeTruthy();
    }
  });

  it.each(Object.keys(LOCALES))('%s: MQ sensor texts never claim CO2, PM2.5 or aerosol', (name) => {
    const claim = /CO₂|CO2|PM2\.5|аэрозол|aerosol|aerozol|углекисл|karbonat|carbon/i;
    for (const [key, value] of Object.entries(LOCALES[name]!)) {
      if (/^(btn_mq|lbl_mq|range_mq)/.test(key)) {
        expect(value, `${name}:${key}`).not.toMatch(claim);
      }
    }
  });
});
