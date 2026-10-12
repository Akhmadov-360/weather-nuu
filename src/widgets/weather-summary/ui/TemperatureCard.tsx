import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getSensorStatus, getTempDeltaFromNorm } from '@/entities/weather/model/weather-thresholds';
import type { WeatherHistoryItem } from '@/entities/weather/model/weather.types';
import { useConnection } from '@/entities/weather/model/connection-context';
import { useTheme } from '@/shared/hooks/useTheme';
import { StatusText } from '@/shared/ui/status-text';
import { atmosphereFor, temperatureTint, thermometerColor } from '../model/atmosphere';
import { AgeMark } from './AgeMark';
import { AtmosphereCanvas } from './AtmosphereCanvas';

type TemperatureCardProps = {
  source: 'room' | 'street';
  temp: number;
  history?: WeatherHistoryItem[];
  historyLoading?: boolean;
};

const SCALE_MIN = -20;
const SCALE_MAX = 40;
const TUBE_TOP = 26;
const TUBE_BOTTOM = 178;

const yOf = (t: number) =>
  TUBE_BOTTOM - ((Math.min(SCALE_MAX, Math.max(SCALE_MIN, t)) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * (TUBE_BOTTOM - TUBE_TOP);

function wordKey(temp: number): string {
  if (temp >= 28) return 'indoor_hot';
  if (temp >= 24) return 'indoor_warm';
  if (temp >= 20) return 'indoor_comfortable';
  if (temp >= 16) return 'indoor_cool';
  return 'indoor_cold';
}

function dayRange(latest: number, history?: WeatherHistoryItem[]): { min: number; max: number } {
  const recent = history?.slice(-1000) ?? [];
  const temps = recent.map((h) => h.temp).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (temps.length === 0) return { min: latest, max: latest };
  return { min: Math.min(...temps, latest), max: Math.max(...temps, latest) };
}

const format = (v: number) => v.toFixed(1).replace('.', ',');

/**
 * Temperature as a thermometer: the mercury rises to the reading and changes
 * colour with it, the day's minimum and maximum are marked on the scale, and
 * the card's background reacts to the air outside (snow, heat shimmer). The
 * classroom only gets a calm background.
 */
export function TemperatureCard({ source, temp, history, historyLoading = false }: TemperatureCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const archive = useConnection().level === 'archive';
  const status = getSensorStatus('temp', temp);
  const delta = getTempDeltaFromNorm(temp);
  const { min, max } = useMemo(() => dayRange(temp, history), [temp, history]);
  const kind = atmosphereFor(temp, source);
  const tint = temperatureTint(temp, resolvedTheme);
  const mercury = thermometerColor(temp, resolvedTheme);

  const hint =
    delta === null
      ? t('status_reference')
      : delta === 0
        ? t('temp_delta_normal')
        : temp > 24
          ? t('temp_delta_above', { value: delta.toFixed(1) })
          : t('temp_delta_below', { value: delta.toFixed(1) });

  const ticks = [-20, -10, 0, 10, 20, 30, 40];

  return (
    <div data-atmosphere-surface className="relative flex h-full min-h-[250px] overflow-hidden rounded-card border border-(--glass-border) bg-(--glass-surface) shadow-card">
      <div
        className="vc-live pointer-events-none absolute inset-0 transition-[background] duration-1000"
        style={{
          background: `linear-gradient(180deg, ${tint.from}, ${tint.to} 62%, transparent)`,
        }}
        aria-hidden
      />
      {archive ? null : <AtmosphereCanvas kind={kind} theme={resolvedTheme} />}

      <svg
        className="vc-live relative z-10 ml-2 mt-4 h-[212px] w-[88px] shrink-0 self-start sm:ml-3"
        viewBox="0 0 88 212"
        role="img"
        aria-label={`${format(temp)} °C`}
      >
        <rect x="46" y={TUBE_TOP - 8} width="16" height={TUBE_BOTTOM - TUBE_TOP + 14} rx="8" fill="var(--control-track)" />
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1="39" x2="45" y1={yOf(tick)} y2={yOf(tick)} stroke="var(--text-muted)" strokeWidth="1" />
            <text x="34" y={yOf(tick) + 3.5} textAnchor="end" fontSize="10" fill="var(--text-muted)">
              {tick}
            </text>
          </g>
        ))}
        <rect
          x="50"
          width="8"
          rx="4"
          fill={mercury}
          y={yOf(temp)}
          height={TUBE_BOTTOM - yOf(temp) + 8}
          style={{ transition: 'y 1.2s cubic-bezier(.34,1.3,.5,1), height 1.2s cubic-bezier(.34,1.3,.5,1), fill .8s' }}
        />
        <circle cx="54" cy="194" r="16" fill={mercury} opacity="0.22" className="motion-safe:animate-pulse" />
        <circle cx="54" cy="194" r="11" fill={mercury} style={{ transition: 'fill .8s' }} />

        {/* Day minimum and maximum on the scale */}
        <path d={`M66 ${yOf(max)} l9 -4.5 v9z`} fill="var(--status-critical)">
          <title>{t('temp_max_title', { value: format(max) })}</title>
        </path>
        <path d={`M66 ${yOf(min)} l9 -4.5 v9z`} fill="var(--status-info)">
          <title>{t('temp_min_title', { value: format(min) })}</title>
        </path>
      </svg>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col p-4 pl-2 sm:p-5 sm:pl-3">
        <div className="flex flex-wrap items-baseline gap-x-2"><div className="text-[11px] uppercase tracking-[0.14em] text-muted-themed">{t(`current_weather_${source}`)}</div><AgeMark /></div>
        <div className="vc-live mt-2 text-[44px] leading-none font-semibold tracking-tight text-primary-themed [font-variant-numeric:proportional-nums] sm:text-5xl">
          {format(temp)}
          <span className="ml-0.5 text-2xl font-normal tracking-normal text-muted-themed">°C</span>
        </div>
        <div className="mt-2 text-base text-secondary-themed">{t(wordKey(temp))}</div>
        <div className="mt-2">
          <StatusText tone={status.tone} className="text-[13px]">
            {hint}
          </StatusText>
        </div>
        <div className="mt-auto pt-3 text-xs text-muted-themed">
          {t('temp_minmax_day')}:{' '}
          {historyLoading ? (
            <span className="inline-block h-3 w-20 animate-pulse rounded bg-(--control-track) align-middle" aria-hidden />
          ) : (
            <>
              <span className="font-medium text-(--status-info)">▾ {format(min)}°</span>{' '}
              <span className="font-medium text-(--status-critical)">▴ {format(max)}°</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
