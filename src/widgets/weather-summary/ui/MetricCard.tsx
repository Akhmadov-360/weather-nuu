import { Droplets, Gauge, ShieldCheck, SprayCan } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { getSensorStatus } from '@/entities/weather/model/weather-thresholds';
import type { SensorType } from '@/entities/weather/model/weather.types';
import { AnimateNumber } from '@/shared/ui/animate-number';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Slider } from '@/components/ui/slider';
import { buildZoneGradient, getMarkerBorderClass, getZoneBgClass } from '@/shared/lib/sensor-format';
import { SENSOR_RANGES } from '@/shared/lib/weather-ranges';

type MetricSensor = Exclude<SensorType, 'temp'>;

type MetricCardProps = {
  sensor: MetricSensor;
  label: string;
  value: number | null | undefined;
  unit?: string;
};

const METRIC_ICON: Record<MetricSensor, React.ElementType> = {
  hum:   Droplets,
  press: Gauge,
  mq5:   ShieldCheck,
  mq3:   SprayCan,
};

export function MetricCard({ sensor, label, value, unit }: MetricCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const status = getSensorStatus(sensor, value ?? null);
  const Icon = METRIC_ICON[sensor];
  const range = SENSOR_RANGES[sensor];
  const displayUnit = unit ?? range.unit;

  return (
    <div className="flex h-full flex-col rounded-card border border-[var(--glass-border)] bg-[var(--glass-surface)] px-4 py-4 shadow-card backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-[10px] uppercase tracking-[0.2em] text-muted-themed sm:text-[11px]">
          {label}
        </div>
        <div className="shrink-0 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface)] p-2 text-secondary-themed">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-end gap-1.5">
        <span className="text-xl font-semibold tracking-tight text-primary-themed sm:text-2xl">
          {value != null ? <AnimateNumber value={value} fractionDigits={1} /> : '—'}
        </span>
        {displayUnit ? <span className="pb-[3px] text-xs text-muted-themed">{displayUnit}</span> : null}
      </div>

      <div className="mt-2">
        <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
      </div>

      {/* Range indicator: shadcn Slider, read-only — track paints the zone
          bands as a static gradient, thumb marks the current reading. */}
      <div className="mt-4">
        <Slider
          value={[value ?? range.min]}
          min={range.min}
          max={range.max}
          disabled
          className="data-disabled:opacity-100"
          trackClassName="h-2 bg-transparent"
          trackStyle={{ background: buildZoneGradient(range) }}
          rangeClassName="hidden"
          thumbClassName={`h-4 w-4 border-2 shadow-md disabled:opacity-100 ${getMarkerBorderClass(status.tone)}`}
        />
        <div className="mt-2 flex items-start justify-between gap-2 text-[11px] text-muted-themed">
          <span>{range.min}</span>
          <span className="text-center">{t(range.normLabelKey)}</span>
          <span>{range.max}</span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-[11px] text-muted-themed sm:grid-cols-2">
        {range.zones.map((zone, i) => (
          <div key={i} className="flex items-start gap-1.5 leading-snug">
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${getZoneBgClass(zone.color)}`} />
            <span>{t(zone.labelKey)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
