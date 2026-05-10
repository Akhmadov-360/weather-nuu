import type { MetricTone } from '@/entities/weather/model/weather-thresholds';
import type { RangeZoneColor } from '@/shared/lib/weather-ranges';

export function formatSensorValue(value: number | null | undefined): string {
  if (value == null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function getToneTextClass(tone: MetricTone): string {
  switch (tone) {
    case 'good':    return 'text-emerald-400';
    case 'warn':    return 'text-amber-400';
    case 'bad':     return 'text-rose-400';
    default:        return 'text-slate-400';
  }
}

export function getZoneBgClass(color: RangeZoneColor): string {
  switch (color) {
    case 'green':  return 'bg-emerald-500';
    case 'yellow': return 'bg-amber-400';
    case 'red':    return 'bg-rose-500';
    case 'blue':   return 'bg-blue-400';
  }
}

export function getMarkerBgClass(tone: MetricTone): string {
  switch (tone) {
    case 'good':  return 'bg-emerald-400';
    case 'warn':  return 'bg-amber-400';
    case 'bad':   return 'bg-rose-400';
    default:      return 'bg-slate-300';
  }
}
