import { useTranslation } from 'react-i18next';

import { getSensorStatus } from '@/entities/weather/model/weather-thresholds';
import { StatusText } from '@/shared/ui/status-text';
import { AgeMark } from './AgeMark';

type HumidityCardProps = {
  value: number | null | undefined;
};

/** Vertical position of a humidity percentage inside the card: one formula for water, ticks, band and flag. */
const at = (percent: number) => `calc(var(--inset) + ${percent / 100} * (100% - 2 * var(--inset)))`;

const TICKS = [0, 30, 60, 100] as const;
const ZONES = [
  { key: 'hum_zone_dry', mid: 15 },
  { key: 'hum_zone_ok', mid: 45 },
  { key: 'hum_zone_humid', mid: 80 },
] as const;

const formatValue = (v: number) => v.toFixed(1).replace('.', ',');

/** A wave layer: the SVG holds two periods so the -50% drift loops without a seam. */
function Wave({ className, opacity, lift }: { className: string; opacity: number; lift: number }): React.JSX.Element {
  const path = `M0 7 q25 -14 50 0${' t50 0'.repeat(15)} V14 H0z`;
  return (
    <svg
      className={className}
      viewBox="0 0 800 14"
      preserveAspectRatio="none"
      aria-hidden
      style={{ position: 'absolute', left: 0, bottom: lift, width: '200%', height: 14 }}
    >
      <path d={path} fill={`color-mix(in srgb, var(--sensor-hum) ${opacity}%, transparent)`} />
    </svg>
  );
}

/**
 * Humidity as a tank: the water stands at the reading, the scale beside it
 * (0, 30, 60, 100) and the flag at the surface share the water's own formula,
 * so every label sits level with what it marks.
 */
export function HumidityCard({ value }: HumidityCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const status = getSensorStatus('hum', value ?? null);
  const percent = value == null || Number.isNaN(value) ? 0 : Math.min(100, Math.max(0, value));
  const flagTitle = value == null ? undefined : t('hum_flag_title', { value: formatValue(value) });

  return (
    <div
      className="relative h-full min-h-[236px] overflow-hidden rounded-card border border-(--glass-border) bg-(--glass-surface) shadow-card sm:min-h-[250px]"
      style={{ ['--inset' as string]: '20px' }}
    >
      {/* Norm band 30–60 % */}
      <div
        className="absolute inset-x-0 bg-status-safe/[0.07]"
        style={{ bottom: at(30), height: 'calc(0.3 * (100% - 2 * var(--inset)))' }}
        aria-hidden
      />

      {/* Water */}
      <div
        className="vc-live absolute inset-x-0 bottom-0 transition-[height] duration-1000 ease-out motion-reduce:transition-none"
        style={{ height: at(percent), background: 'color-mix(in srgb, var(--sensor-hum) 15%, transparent)' }}
        aria-hidden
      >
        <div className="absolute inset-x-0 top-0 h-0 overflow-visible">
          <Wave className="hum-wave-a" opacity={22} lift={0} />
          <Wave className="hum-wave-b" opacity={14} lift={-4} />
        </div>
      </div>

      {/* Dashed lines at the norm limits */}
      {[30, 60].map((p) => (
        <div
          key={p}
          className="absolute inset-x-0 border-t border-dashed border-(--text-muted)/40"
          style={{ bottom: at(p) }}
          aria-hidden
        />
      ))}

      {/* Scale: numbers at the right edge, zone words beside them, each at its own height */}
      {TICKS.map((p) => (
        <span
          key={p}
          className="absolute right-3 w-7 translate-y-1/2 text-right text-[11px] leading-none text-muted-themed"
          style={{ bottom: at(p) }}
          aria-hidden
        >
          {p}
        </span>
      ))}
      {ZONES.map((zone) => (
        <span
          key={zone.key}
          className="absolute right-12 translate-y-1/2 text-[11px] leading-none text-muted-themed"
          style={{ bottom: at(zone.mid) }}
          aria-hidden
        >
          {t(zone.key)}
        </span>
      ))}

      {/* Level flag: the value, at the surface, left of the zone words */}
      {value != null ? (
        <div
          className="absolute right-[6.5rem] flex translate-y-1/2 items-center transition-[bottom] duration-1000 ease-out motion-reduce:transition-none"
          style={{ bottom: at(percent) }}
          title={flagTitle}
        >
          <span className="rounded-md border border-(--glass-border) bg-(--glass-surface) px-1.5 py-0.5 text-xs font-semibold text-primary-themed shadow-sm">
            {formatValue(value)} %
          </span>
        </div>
      ) : null}

      {/* Text */}
      <div className="relative z-10 flex h-full flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline gap-x-2"><div className="text-[11px] uppercase tracking-[0.14em] text-muted-themed">{t('lbl_hum')}</div><AgeMark /></div>
        <div className="vc-live mt-2 text-[44px] leading-none font-semibold tracking-tight text-primary-themed [font-variant-numeric:proportional-nums] sm:text-5xl">
          {value == null ? '—' : formatValue(value)}
          <span className="ml-1 text-base font-normal tracking-normal text-muted-themed">%</span>
        </div>
        <div className="mt-2">
          <StatusText tone={status.tone} className="text-[13px]">
            {t(status.labelKey)}
          </StatusText>
        </div>
        <div className="mt-1.5 text-xs text-muted-themed">{t('hum_norm_band')}</div>
      </div>
    </div>
  );
}
