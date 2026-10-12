import NumberFlow from '@number-flow/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { reliabilityStrip, STRIP_MINUTES } from '@/entities/weather/model/reliability';
import { splitAge } from '@/entities/weather/model/connection';
import { useConnection } from '@/entities/weather/model/connection-context';
import type { WeatherHistoryItem } from '@/entities/weather/model/weather.types';
import { STATION } from '@/shared/config/station';
import { cn } from '@/shared/lib/cn';
import { skyState, type DayPhase } from '@/shared/lib/sky';
import { formatStationDate, formatStationTime, stationClock } from '../model/station-time';
import { ReliabilityStrip } from './ReliabilityStrip';
import { SkyArc } from './SkyArc';
import { SkyLight } from './SkyLight';

const PHASES: DayPhase[] = ['night', 'dawn', 'morning', 'day', 'evening', 'dusk'];
const MINUTE_MS = 60_000;

type TimeCardProps = {
  history: WeatherHistoryItem[];
  /** Pins the clock (development review of the sky phases); otherwise the real time. */
  now?: number;
};

function useNow(pinned: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (pinned !== undefined) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pinned]);
  return pinned ?? now;
}

/** Soft sky behind the upper part of the card; all phases are stacked and cross-fade when the phase changes. */
function Sky({ phase }: { phase: DayPhase | null }): React.JSX.Element {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ maskImage: 'linear-gradient(180deg, #000 45%, transparent 82%)' }}
      aria-hidden
    >
      {PHASES.map((p) => (
        <div
          key={p}
          className="absolute inset-0 transition-opacity duration-[1500ms] ease-out motion-reduce:transition-none"
          style={{
            opacity: p === phase ? 1 : 0,
            background: `linear-gradient(180deg, var(--sky-${p}-from), var(--sky-${p}-to))`,
          }}
        />
      ))}
      <SkyLight phase={phase} />
    </div>
  );
}

export function TimeCard({ history, now: pinnedNow }: TimeCardProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const now = useNow(pinnedNow);
  const connection = useConnection();
  const level = connection.level;

  const { hours, minutes } = stationClock(now);
  const sky = useMemo(() => skyState(now, STATION.lat, STATION.lon, STATION.utcOffsetMinutes), [now]);

  const dateText = useMemo(() => formatStationDate(now, i18n.language), [i18n.language, now]);

  // The strip only needs a fresh calculation when a new reading or a new minute arrives.
  const minuteKey = Math.floor(now / MINUTE_MS);
  const lastDate = history[history.length - 1]?.date;
  const strip = useMemo(
    () => reliabilityStrip(history, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, minuteKey, Math.floor(now / 10_000)],
  );
  const minuteLabels = useMemo(
    () => Array.from({ length: STRIP_MINUTES }, (_, i) => formatStationTime((minuteKey - (STRIP_MINUTES - 1 - i)) * MINUTE_MS)),
    [minuteKey],
  );

  const ageSeconds = lastDate ? Math.max(0, Math.round((now - Date.parse(lastDate)) / 1000)) : 0;
  const age = connection.ageMs === null ? null : splitAge(connection.ageMs);
  const ago = age ? t(`age_ago_${age.unit}`, { n: age.n }) : '';
  const statusText =
    level === 'live'
      ? t('fresh_live_ago', { seconds: ageSeconds })
      : level === 'delayed'
        ? t('fresh_delayed', { ago })
        : age
          ? t('fresh_archive', { ago })
          : t('fresh_never');

  return (
    <div data-atmosphere-surface className="relative flex h-full flex-col overflow-hidden rounded-card border border-(--glass-border) bg-(--glass-surface) p-4 shadow-card sm:p-5">
      <Sky phase={sky?.phase ?? null} />

      <div className="relative flex flex-1 flex-col">
        <div
          className="flex items-baseline text-[48px] leading-none font-semibold tracking-tight text-primary-themed sm:text-[52px]"
          aria-label={`${formatStationTime(now)}, ${t('time_station_zone')}`}
        >
          <NumberFlow value={hours} locales="en-US" format={{ minimumIntegerDigits: 2, useGrouping: false }} trend={1} />
          <span className="mx-[3px] opacity-50" aria-hidden>
            :
          </span>
          <NumberFlow value={minutes} locales="en-US" format={{ minimumIntegerDigits: 2, useGrouping: false }} trend={1} />
          <span className="ml-2 text-xs font-normal tracking-normal text-muted-themed" title={t('time_station_zone')}>
            UTC+{STATION.utcOffsetMinutes / 60}
          </span>
        </div>

        <div className="mt-1.5 text-sm text-secondary-themed">
          <span className="first-letter:uppercase">{dateText}</span>
          {sky ? <span className="text-muted-themed"> · {t(`phase_${sky.phase}`)}</span> : null}
        </div>

        {sky ? (
          <div className="mt-2">
            <SkyArc sky={sky} formatTime={formatStationTime} />
          </div>
        ) : null}

        <div className="mt-auto pt-2">
          <div className="mb-1.5 flex items-center gap-2 text-xs">
            <span
              className={cn(
                'inline-block h-2 w-2 shrink-0 rounded-full',
                level === 'live' && 'bg-status-safe motion-safe:animate-pulse',
                level === 'delayed' && 'bg-status-warning',
                level === 'archive' && 'bg-(--text-muted)',
              )}
            />
            <span
              className={cn(
                level === 'live' && 'text-secondary-themed',
                level === 'delayed' && 'text-status-warning',
                level === 'archive' && 'text-muted-themed',
              )}
            >
              {statusText}
            </span>
            <span className="ml-auto text-muted-themed" title={t('strip_covered', { count: strip.covered })}>
              {t('strip_covered_short', { count: strip.covered })}
            </span>
          </div>
          <ReliabilityStrip
            buckets={strip.buckets}
            summary={t('strip_covered', { count: strip.covered })}
            minuteLabels={minuteLabels}
          />
        </div>
      </div>
    </div>
  );
}
