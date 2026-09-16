import {
  Flame, Snowflake, Thermometer, ThermometerSnowflake, ThermometerSun,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { getSensorStatus, getTempDeltaFromNorm } from '@/entities/weather/model/weather-thresholds';
import type { WeatherHistoryItem } from '@/entities/weather/model/weather.types';
import { formatSensorValue, getToneTextClass } from '@/shared/lib/sensor-format';

type TempHeroCardProps = {
  temp: number;
  history?: WeatherHistoryItem[];
};

function getIndoorCondition(temp?: number) {
  if (temp === undefined || temp === null) return { labelKey: 'indoor_unknown', icon: Thermometer };
  if (temp >= 28) return { labelKey: 'indoor_hot',          icon: Flame };
  if (temp >= 24) return { labelKey: 'indoor_warm',         icon: ThermometerSun };
  if (temp >= 20) return { labelKey: 'indoor_comfortable',  icon: Thermometer };
  if (temp >= 16) return { labelKey: 'indoor_cool',         icon: ThermometerSnowflake };
  return             { labelKey: 'indoor_cold',             icon: Snowflake };
}

function getMinMax(latest: number, history?: WeatherHistoryItem[]) {
  const recent = history?.slice(-1000);
  if (recent && recent.length > 0) {
    const temps = recent.map((h) => h.temp).filter((v): v is number => v != null);
    if (temps.length > 0) {
      let lo = temps[0]!, hi = temps[0]!;
      for (const v of temps) { if (v < lo) lo = v; if (v > hi) hi = v; }
      return { min: lo.toFixed(1), max: hi.toFixed(1) };
    }
  }
  return { min: (latest - 2).toFixed(1), max: (latest + 2).toFixed(1) };
}

export function TempHeroCard({ temp, history }: TempHeroCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const condition = getIndoorCondition(temp);
  const Icon = condition.icon;
  const { min, max } = getMinMax(temp, history);
  const status = getSensorStatus('temp', temp ?? null);
  const delta = getTempDeltaFromNorm(temp ?? null);

  const hint =
    delta === null
      ? t('status_reference')
      : delta === 0
        ? t('temp_delta_normal')
        : temp > 24
          ? t('temp_delta_above', { value: delta.toFixed(1) })
          : t('temp_delta_below', { value: delta.toFixed(1) });

  return (
    <div className="flex h-full flex-col justify-between rounded-card border border-[var(--glass-border)] bg-[var(--glass-surface)] p-4 shadow-card backdrop-blur-md sm:p-5">
      <span className="text-[10px] uppercase tracking-[0.25em] text-muted-themed sm:text-xs">
        {t('current_weather')}
      </span>

      <div className="mt-4 flex items-center gap-3 sm:gap-4">
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface)] p-3 sm:p-4">
          <Icon className="h-10 w-10 text-yellow-500 dark:text-yellow-300 sm:h-12 sm:w-12" />
        </div>

        <div className="min-w-0">
          <div className="text-3xl font-semibold tracking-tight text-primary-themed sm:text-4xl 2xl:text-5xl">
            {formatSensorValue(temp)}°C
          </div>
          <div className="mt-1 text-sm text-secondary-themed sm:text-base">{t(condition.labelKey)}</div>
          <div className={`mt-2 text-xs sm:text-sm ${getToneTextClass(status.tone)}`}>{hint}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs text-secondary-themed sm:text-sm">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-1.5">
          <span className="text-status-info">↓</span>
          <span>{min}°C</span>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 py-1.5">
          <span className="text-status-warning">↑</span>
          <span>{max}°C</span>
        </div>
      </div>
    </div>
  );
}
