import type { MetricTone } from '@/entities/weather/model/weather-thresholds';
import type { RangeZoneColor, SensorRangeConfig } from '@/shared/lib/weather-ranges';

export function formatSensorValue(value: number | null | undefined): string {
  if (value == null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function getToneTextClass(tone: MetricTone): string {
  switch (tone) {
    case 'good':    return 'text-status-safe';
    case 'warn':    return 'text-status-warning';
    case 'bad':     return 'text-status-critical';
    default:        return 'text-slate-400';
  }
}

export function getZoneBgClass(color: RangeZoneColor): string {
  switch (color) {
    case 'green':  return 'bg-status-safe';
    case 'yellow': return 'bg-status-warning';
    case 'red':    return 'bg-status-critical';
    case 'blue':   return 'bg-status-info';
  }
}

export function getMarkerBgClass(tone: MetricTone): string {
  switch (tone) {
    case 'good':  return 'bg-status-safe';
    case 'warn':  return 'bg-status-warning';
    case 'bad':   return 'bg-status-critical';
    default:      return 'bg-slate-300';
  }
}

export function getMarkerBorderClass(tone: MetricTone): string {
  switch (tone) {
    case 'good':  return 'border-status-safe';
    case 'warn':  return 'border-status-warning';
    case 'bad':   return 'border-status-critical';
    default:      return 'border-slate-300';
  }
}

const ZONE_COLOR_VAR: Record<RangeZoneColor, string> = {
  green:  'var(--status-safe)',
  yellow: 'var(--status-warning)',
  red:    'var(--status-critical)',
  blue:   'var(--status-info)',
};

/**
 * A static `linear-gradient` covering a sensor's zones, used as the Slider
 * track background. Unlike Progress's fill-from-zero semantics, a Slider
 * track that already shows the whole scale's colored bands (with a thumb
 * marking the current reading) is the correct primitive for "where does
 * this value sit within the safe/warning/critical range" — Progress can't
 * represent that without misleadingly filling a solid bar up to the value.
 */
export function buildZoneGradient(range: SensorRangeConfig): string {
  const span = range.max - range.min;
  const stops = range.zones.flatMap((zone) => {
    const from = ((zone.from - range.min) / span) * 100;
    const to = ((zone.to - range.min) / span) * 100;
    const color = ZONE_COLOR_VAR[zone.color];
    return [`${color} ${from}%`, `${color} ${to}%`];
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
