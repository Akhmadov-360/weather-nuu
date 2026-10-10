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

export type ChartTheme = {
  axisLabel: string;
  gridLine: string;
  axisLine: string;
  tooltipBg: string;
  tooltipBorder: string;
  surface: string;
  surfaceSoft: string;
  surfaceHover: string;
};

const CHART_THEME_FALLBACK: ChartTheme = {
  axisLabel: 'rgba(30, 35, 71, 0.60)',
  gridLine: 'rgba(35, 40, 86, 0.07)',
  axisLine: 'rgba(35, 40, 86, 0.14)',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E0DAD3',
  surface: '#FFFFFF',
  surfaceSoft: '#FAF7F3',
  surfaceHover: '#FAF7F3',
};

/**
 * Chart chrome colours of the current theme. ECharts draws on a canvas and
 * does not resolve `var(--x)` in its colour options (it falls back to black),
 * so the chart gets the resolved values; callers re-read them on a theme change.
 */
export function getChartTheme(): ChartTheme {
  if (typeof document === 'undefined') return CHART_THEME_FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    axisLabel: read('--chart-axis-label', CHART_THEME_FALLBACK.axisLabel),
    gridLine: read('--chart-grid-line', CHART_THEME_FALLBACK.gridLine),
    axisLine: read('--chart-axis-line', CHART_THEME_FALLBACK.axisLine),
    tooltipBg: read('--chart-tooltip-bg', CHART_THEME_FALLBACK.tooltipBg),
    tooltipBorder: read('--chart-tooltip-border', CHART_THEME_FALLBACK.tooltipBorder),
    surface: read('--glass-surface', CHART_THEME_FALLBACK.surface),
    surfaceSoft: read('--glass-surface-soft', CHART_THEME_FALLBACK.surfaceSoft),
    surfaceHover: read('--glass-surface-hover', CHART_THEME_FALLBACK.surfaceHover),
  };
}
