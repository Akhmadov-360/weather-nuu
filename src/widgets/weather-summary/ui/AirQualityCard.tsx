import { ArrowRight, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Slider } from '@/components/ui/slider';
import { buildDustCardModel, type DustReading } from '@/entities/weather/model/dust-card';
import type { WeatherHistoryItem } from '@/entities/weather/model/weather.types';
import {
  DEFAULT_STANDARD_ID,
  WHO_2021_GUIDELINES,
  categoryCssVar,
  categoryTextCssVar,
  getStandard,
  zoneStops,
  type CategoryId,
} from '@/shared/lib/air-quality';
import { ROUTES } from '@/shared/config/routes';
import { AnimateNumber } from '@/shared/ui/animate-number';
import { DustField, NoSensorArt, SettledDust, SilentLens } from './DustVisuals';

type AirQualityCardProps = {
  source: 'room' | 'street';
  history: WeatherHistoryItem[];
  /** 24 h PM2.5 mean from the aggregate query; undefined while loading or after an error. */
  dayMean: { mean: number; coverage: number } | null | undefined;
};

/** The zone bar covers 0..150 µg/m³; readings beyond that pin the marker to the end. */
const BAR_MAX = 150;
const WHO_PM25_DAILY = WHO_2021_GUIDELINES.find((g) => g.pollutant === 'pm25' && g.period === '24h')?.value;

const fill = (id: CategoryId) => `var(${categoryCssVar(id)})`;
const text = (id: CategoryId) => `var(${categoryTextCssVar(id)})`;

function buildGradient(): string {
  const stops = zoneStops(getStandard(DEFAULT_STANDARD_ID), 'pm25', BAR_MAX).flatMap((s) => [
    `${fill(s.category)} ${s.fromPct}%`,
    `${fill(s.category)} ${s.toPct}%`,
  ]);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
const GRADIENT = buildGradient();

/** The card frame: `art` sits behind the content, which stays above it. */
function Shell({ art, children }: { art?: React.ReactNode; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="relative h-full overflow-hidden rounded-card border border-(--glass-border) bg-(--glass-surface) shadow-card">
      {art}
      <div className="relative z-10 flex h-full flex-col px-4 py-4 sm:p-5">{children}</div>
    </div>
  );
}

function CardHeader({ label }: { label: string }): React.JSX.Element {
  return <div className="min-w-0 text-[11px] uppercase tracking-[0.14em] text-muted-themed">{label}</div>;
}

function CategoryBadge({ category, label }: { category: CategoryId; label: string }): React.JSX.Element {
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-medium tracking-wide"
      style={{
        color: text(category),
        borderColor: `color-mix(in srgb, ${fill(category)} 40%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${fill(category)} 14%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

function formatMean(value: number): string {
  return value.toFixed(1);
}

function SecondaryLine({ name, reading }: { name: string; reading: DustReading }): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 text-[13px] text-secondary-themed">
      <span className="text-muted-themed">{name}</span>
      <span className="font-medium text-primary-themed">{formatMean(reading.mean)}</span>
      <span className="text-muted-themed">{t('unit_ugm3')}</span>
      {reading.category ? (
        <span className="font-medium" style={{ color: text(reading.category) }}>
          · {t(`aqi_cat_${reading.category}`)}
        </span>
      ) : null}
    </div>
  );
}

export function AirQualityCard({ source, history, dayMean }: AirQualityCardProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const model = buildDustCardModel({ source, history, dayMean });
  const label = t('lbl_pm25');

  if (model.kind === 'no_sensor') {
    return (
      <Shell art={<NoSensorArt />}>
        <CardHeader label={label} />
        <div className="mt-6 text-lg font-semibold text-primary-themed">{t('dust_no_sensor')}</div>
        <div className="mt-1 max-w-sm text-sm text-muted-themed">{t('dust_no_sensor_hint')}</div>
        <Link
          to={ROUTES.room}
          className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-(--status-info)/60 px-4 py-2 text-sm text-(--status-info) transition-colors hover:bg-(--status-info)/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--status-info)"
        >
          {t('dust_go_room')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Shell>
    );
  }

  if (model.kind === 'no_data') {
    const since = model.lastSeen
      ? new Intl.DateTimeFormat(i18n.language, {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(model.lastSeen))
      : null;
    return (
      <Shell
        art={
          <>
            <SettledDust />
            <SilentLens className="pointer-events-none absolute -right-6 top-1/2 hidden h-52 w-52 -translate-y-1/2 sm:block" />
          </>
        }
      >
        <CardHeader label={label} />
        <div className="mt-6 text-lg font-semibold text-primary-themed">{t('dust_no_data')}</div>
        <div className="mt-1 text-sm text-muted-themed">
          {since ? t('dust_no_data_since', { time: since }) : t('dust_no_data_never')}
        </div>
        <div className="mt-auto inline-flex w-fit items-center gap-2 rounded-lg bg-(--control-track) px-3 py-1.5 text-sm text-secondary-themed">
          <WifiOff className="h-4 w-4" aria-hidden />
          {t('dust_sensor_silent')}
        </div>
      </Shell>
    );
  }

  const { pm25, pm10, day } = model;
  const category = pm25.category;

  return (
    <Shell art={<DustField pm25={pm25.mean} pm10={pm10?.mean ?? null} colorVar={category ? categoryTextCssVar(category) : '--status-info'} />}>
      <CardHeader label={label} />

      <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
        <div className="flex items-end gap-1.5">
          <span className="text-[44px] leading-none font-semibold tracking-tight text-primary-themed [font-variant-numeric:proportional-nums] sm:text-5xl">
            <AnimateNumber value={pm25.mean} fractionDigits={1} />
          </span>
          <span className="pb-1 text-base text-muted-themed">{t('unit_ugm3')}</span>
        </div>
        {pm25.aqi != null ? (
          <div className="pb-1 text-base text-secondary-themed">
            <span className="text-muted-themed">{t('aqi_label')}</span>{' '}
            <span className="text-2xl font-semibold text-primary-themed">{pm25.aqi}</span>
          </div>
        ) : null}
        {category ? (
          <div className="pb-1">
            <CategoryBadge category={category} label={t(`aqi_cat_${category}`)} />
          </div>
        ) : null}
      </div>
      <div className="mt-1.5 text-xs text-muted-themed">{t('dust_avg_10m')}</div>

      <div className="mt-4">
        <Slider
          value={[Math.min(Math.max(pm25.mean, 0), BAR_MAX)]}
          min={0}
          max={BAR_MAX}
          disabled
          className="data-disabled:opacity-100"
          trackClassName="data-horizontal:h-2 bg-transparent"
          trackStyle={{ background: GRADIENT }}
          rangeClassName="hidden"
          thumbClassName="h-4 w-4 border-2 border-(--marker) shadow-md disabled:opacity-100"
          style={{ ["--marker" as string]: category ? fill(category) : "var(--status-info)" }}
        />
        <div className="mt-2 flex justify-between text-[11px] text-muted-themed">
          <span>0</span>
          <span>{BAR_MAX}+</span>
        </div>
      </div>

      <div className="mt-3 grid gap-1.5">
        {pm10 ? <SecondaryLine name="PM10" reading={pm10} /> : null}
        {day ? (
          <SecondaryLine name={`PM2.5 · ${t('dust_avg_24h')}`} reading={day} />
        ) : (
          <div className="text-[13px] text-muted-themed">PM2.5 · {t('dust_insufficient_24h')}</div>
        )}
      </div>

      {WHO_PM25_DAILY != null ? (
        <div className="mt-3 text-xs text-muted-themed">{t('dust_who_guideline', { value: WHO_PM25_DAILY })}</div>
      ) : null}
    </Shell>
  );
}
