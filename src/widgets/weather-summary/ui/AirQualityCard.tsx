import { CloudFog } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
import { AnimateNumber } from '@/shared/ui/animate-number';

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

const CARD_CLASS =
  'flex h-full flex-col rounded-card border border-(--glass-border) bg-(--glass-surface) px-4 py-4 shadow-card backdrop-blur-md sm:p-5';

function CardHeader({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 text-[10px] uppercase tracking-[0.2em] text-muted-themed sm:text-[11px]">{label}</div>
      <div className="shrink-0 rounded-xl border border-(--glass-border) bg-(--glass-surface) p-2 text-secondary-themed">
        <CloudFog className="h-4 w-4" />
      </div>
    </div>
  );
}

function CategoryBadge({ category, label }: { category: CategoryId; label: string }): React.JSX.Element {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide"
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
    <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs text-secondary-themed">
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
      <div className={CARD_CLASS}>
        <CardHeader label={label} />
        <div className="mt-6 text-lg font-semibold text-primary-themed">{t('dust_no_sensor')}</div>
        <div className="mt-1 text-sm text-muted-themed">{t('dust_no_sensor_hint')}</div>
      </div>
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
      <div className={CARD_CLASS}>
        <CardHeader label={label} />
        <div className="mt-6 text-lg font-semibold text-primary-themed">{t('dust_no_data')}</div>
        <div className="mt-1 text-sm text-muted-themed">
          {since ? t('dust_no_data_since', { time: since }) : t('dust_no_data_never')}
        </div>
      </div>
    );
  }

  const { pm25, pm10, day } = model;
  const category = pm25.category;

  return (
    <div className={CARD_CLASS}>
      <CardHeader label={label} />

      <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
        <div className="flex items-end gap-1.5">
          <span className="text-3xl font-semibold tracking-tight text-primary-themed sm:text-4xl">
            <AnimateNumber value={pm25.mean} fractionDigits={1} />
          </span>
          <span className="pb-1 text-xs text-muted-themed">{t('unit_ugm3')}</span>
        </div>
        {pm25.aqi != null ? (
          <div className="pb-1 text-sm text-secondary-themed">
            <span className="text-muted-themed">{t('aqi_label')}</span>{' '}
            <span className="text-lg font-semibold text-primary-themed">{pm25.aqi}</span>
          </div>
        ) : null}
        {category ? (
          <div className="pb-1">
            <CategoryBadge category={category} label={t(`aqi_cat_${category}`)} />
          </div>
        ) : null}
      </div>
      <div className="mt-1 text-[11px] text-muted-themed">{t('dust_avg_10m')}</div>

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
          <div className="text-xs text-muted-themed">PM2.5 · {t('dust_insufficient_24h')}</div>
        )}
      </div>

      {WHO_PM25_DAILY != null ? (
        <div className="mt-3 text-[11px] text-muted-themed">{t('dust_who_guideline', { value: WHO_PM25_DAILY })}</div>
      ) : null}
    </div>
  );
}
