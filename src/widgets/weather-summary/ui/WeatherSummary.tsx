import { motion } from 'framer-motion';
import {
  Droplets, Flame, Gauge, ShieldCheck, Snowflake,
  SprayCan, Thermometer, ThermometerSnowflake, ThermometerSun,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { getSensorStatus, getTempDeltaFromNorm } from '@/entities/weather/model/weather-thresholds';
import type { SensorType, WeatherHistoryItem, WeatherLatest } from '@/entities/weather/model/weather.types';
import { AnimateNumber } from '@/shared/ui/animate-number';
import { StatusBadge } from '@/shared/ui/status-badge';
import { GlassPanel } from '@/shared/ui/glass-panel';
import { formatSensorValue, getToneTextClass, getZoneBgClass, getMarkerBgClass } from '@/shared/lib/sensor-format';
import { SENSOR_RANGES } from '@/shared/lib/weather-ranges';

type WeatherSummaryProps = {
  latest: WeatherLatest;
  history?: WeatherHistoryItem[];
};

type MetricProps = {
  sensor: SensorType;
  label: string;
  value: number | null | undefined;
  unit?: string;
};

function getIndoorCondition(temp?: number) {
  if (temp === undefined || temp === null) return { labelKey: 'indoor_unknown', icon: Thermometer };
  if (temp >= 28) return { labelKey: 'indoor_hot',          icon: Flame };
  if (temp >= 24) return { labelKey: 'indoor_warm',         icon: ThermometerSun };
  if (temp >= 20) return { labelKey: 'indoor_comfortable',  icon: Thermometer };
  if (temp >= 16) return { labelKey: 'indoor_cool',         icon: ThermometerSnowflake };
  return             { labelKey: 'indoor_cold',             icon: Snowflake };
}

function getMetricIcon(sensor: SensorType): React.ElementType {
  switch (sensor) {
    case 'hum':   return Droplets;
    case 'press': return Gauge;
    case 'mq5':   return ShieldCheck;
    case 'mq3':   return SprayCan;
    default:      return Gauge;
  }
}

function Metric({ sensor, label, value, unit }: MetricProps): React.JSX.Element {
  const { t } = useTranslation();
  const status = getSensorStatus(sensor, value ?? null);
  const Icon   = getMetricIcon(sensor);
  const range  = SENSOR_RANGES[sensor];
  const displayUnit = unit ?? range.unit;
  const percent =
    value != null
      ? Math.min(100, Math.max(0, ((value - range.min) / (range.max - range.min)) * 100))
      : 0;

  return (
    <div
      className="border px-4 py-4 backdrop-blur-md"
      style={{
        borderRadius: '16px',
        backgroundColor: 'var(--glass-surface)',
        borderColor: 'var(--glass-border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-[10px] uppercase tracking-[0.2em] text-muted-themed sm:text-[11px]">
          {label}
        </div>
        <div
          className="shrink-0 rounded-xl border p-2 text-secondary-themed"
          style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-surface)' }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {/* Value */}
      <div className="mt-3 flex items-end gap-1.5">
        <span className="text-xl font-semibold tracking-tight text-primary-themed sm:text-2xl">
          {value != null ? <AnimateNumber value={value} fractionDigits={1} /> : '—'}
        </span>
        {displayUnit ? (
          <span className="pb-[3px] text-xs text-muted-themed">{displayUnit}</span>
        ) : null}
      </div>

      {/* Status badge */}
      <div className="mt-2">
        <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
      </div>

      {/* Range bar */}
      <div className="mt-4">
        <div className="relative h-2 rounded-full bg-slate-800/20 dark:bg-slate-800/40">
          {range.zones.map((zone, i) => {
            const left  = ((zone.from - range.min) / (range.max - range.min)) * 100;
            const width = ((zone.to   - zone.from) / (range.max - range.min)) * 100;
            return (
              <motion.div
                key={i}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: `${width}%`, opacity: 1 }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
                className={`absolute top-0 h-full rounded-full ${getZoneBgClass(zone.color)}`}
                style={{ left: `${left}%` }}
              />
            );
          })}

          <motion.div
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: `${percent}%`, marginLeft: '-3px' }}
            animate={{ left: `${percent}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
          >
            <motion.div className="relative flex flex-col items-center">
              <motion.div
                className={`absolute -inset-2 rounded-full ${getMarkerBgClass(status.tone)} opacity-20`}
                animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="relative h-5 w-1.5 rounded-full bg-white shadow-lg dark:bg-white" style={{ backgroundColor: 'var(--text-primary)' }} />
              <div className={`absolute inset-x-[2px] top-1/2 h-3 w-1 rounded-full ${getMarkerBgClass(status.tone)} -translate-y-1/2`} />
            </motion.div>
          </motion.div>
        </div>

        <div className="mt-2 flex items-start justify-between gap-2 text-[11px] text-muted-themed">
          <span>{range.min}</span>
          <span className="text-center">{t(range.normLabelKey)}</span>
          <span>{range.max}</span>
        </div>
      </div>

      {/* Zone legend */}
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

function getMinMax(latest?: number | null, history?: WeatherHistoryItem[]) {
  const recent = history?.slice(-1000);
  if (recent && recent.length > 0) {
    const temps = recent.map((h) => h.temp).filter((v): v is number => v != null);
    if (temps.length > 0) {
      let lo = temps[0], hi = temps[0];
      for (const v of temps) { if (v < lo) lo = v; if (v > hi) hi = v; }
      return { min: lo.toFixed(1), max: hi.toFixed(1) };
    }
  }
  if (typeof latest === 'number') {
    return { min: (latest - 2).toFixed(1), max: (latest + 2).toFixed(1) };
  }
  return { min: null, max: null };
}

export function WeatherSummary({ latest, history }: WeatherSummaryProps): React.JSX.Element {
  const { t } = useTranslation();
  const condition  = getIndoorCondition(latest.temp);
  const Icon       = condition.icon;
  const { min, max } = getMinMax(latest.temp, history);
  const tempStatus = getSensorStatus('temp', latest.temp ?? null);
  const tempDelta  = getTempDeltaFromNorm(latest.temp ?? null);

  const tempHint =
    tempDelta === null
      ? t('status_reference')
      : tempDelta === 0
        ? t('temp_delta_normal')
        : latest.temp > 24
          ? t('temp_delta_above', { value: tempDelta.toFixed(1) })
          : t('temp_delta_below', { value: tempDelta.toFixed(1) });

  return (
    <GlassPanel className="p-4 sm:p-5 lg:p-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-start"
      >
        {/* Temperature hero */}
        <div className="flex flex-col justify-between rounded-[24px] p-4 sm:p-5">
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-themed sm:text-xs">
            {t('current_weather')}
          </span>

          <div className="mt-4 flex items-center gap-3 sm:gap-4">
            <div
              className="rounded-2xl border p-3 sm:p-4"
              style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-surface)' }}
            >
              <Icon className="h-10 w-10 text-yellow-500 dark:text-yellow-300 sm:h-12 sm:w-12" />
            </div>

            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight text-primary-themed sm:text-4xl 2xl:text-5xl">
                {formatSensorValue(latest.temp)}°C
              </div>
              <div className="mt-1 text-sm text-secondary-themed sm:text-base">
                {t(condition.labelKey)}
              </div>
              <div className={`mt-2 text-xs sm:text-sm ${getToneTextClass(tempStatus.tone)}`}>
                {tempHint}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 text-xs text-secondary-themed sm:text-sm">
            <div
              className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5"
              style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-surface)' }}
            >
              <span className="text-sky-500 dark:text-sky-300">↓</span>
              <span>{min ?? '—'}°C</span>
            </div>
            <div
              className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5"
              style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-surface)' }}
            >
              <span className="text-amber-500 dark:text-amber-300">↑</span>
              <span>{max ?? '—'}°C</span>
            </div>
          </div>
        </div>

        {/* Sensor metrics grid */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Metric sensor="hum"   label={t('lbl_hum')}   value={latest.hum} />
          <Metric sensor="press" label={t('lbl_press')} value={latest.press} />
          <Metric sensor="mq5"   label={t('lbl_mq5')}   value={latest.mq5} />
          <Metric sensor="mq3"   label={t('lbl_mq3')}   value={latest.mq3} />
        </div>
      </motion.div>
    </GlassPanel>
  );
}
