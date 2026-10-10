import type { SensorType } from '@/shared/types/sensor';

/** Light-theme values, used only when the stylesheet is not available (tests, SSR). */
const FALLBACK: Record<SensorType, string> = {
  temp: '#C4553B',
  hum: '#3A86C8',
  press: '#41309A',
  pm25: '#9B3E9E',
  pm10: '#6B5110',
  mq5: '#D9731A',
  mq3: '#2F855A',
};

/**
 * Series colour of a sensor in the current theme, read from `--sensor-<id>`
 * (defined per theme in globals.css). ECharts needs a concrete colour string
 * to derive its translucent fills from, so callers re-read this when the
 * theme changes; DOM code should use `var(--sensor-<id>)` directly.
 */
export function getSensorColor(sensor: SensorType): string {
  if (typeof document === 'undefined') return FALLBACK[sensor];
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--sensor-${sensor}`).trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value : FALLBACK[sensor];
}
