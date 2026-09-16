import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FreshnessState } from '@/entities/weather/model/weather-freshness';

type TimeDisplayProps = {
  /** Defaults to 'live' styling if omitted — callers without history data (e.g. loading state) don't need to know about this. */
  freshness?: FreshnessState;
};

const FRESHNESS_STYLE: Record<FreshnessState, { badgeClass: string; dotClass: string; pulse: boolean; labelKey: string }> = {
  live:    { badgeClass: 'border-status-safe/20 bg-status-safe/10 text-status-safe',       dotClass: 'bg-status-safe',    pulse: true,  labelKey: 'live' },
  stale:   { badgeClass: 'border-status-warning/20 bg-status-warning/10 text-status-warning', dotClass: 'bg-status-warning', pulse: false, labelKey: 'stale' },
  // Calm/neutral, not alarming — offline sensors are an expected state
  // (e.g. nobody in the building over summer), not an error.
  offline: { badgeClass: 'border-[var(--glass-border)] bg-[var(--glass-surface-hover)] text-muted-themed', dotClass: 'bg-[var(--text-muted)]', pulse: false, labelKey: 'offline' },
};

export function TimeDisplay({ freshness = 'live' }: TimeDisplayProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const time = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now),
    [i18n.language, now],
  );

  const date = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      }).format(now),
    [i18n.language, now],
  );

  return (
    <div className="flex h-full flex-col justify-between rounded-card border border-[var(--glass-border)] bg-[var(--glass-surface)] p-4 shadow-card backdrop-blur-md sm:p-5">
      <div>
        <div className="text-5xl font-semibold tracking-tight text-primary-themed sm:text-6xl">
          {time}
        </div>
        <div className="mt-2 text-sm uppercase tracking-[0.28em] text-secondary-themed sm:text-base">
          {date}
        </div>
      </div>

      <div
        className={`mt-6 inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.22em] ${FRESHNESS_STYLE[freshness].badgeClass}`}
      >
        <span
          className={`h-2 w-2 rounded-full ${FRESHNESS_STYLE[freshness].dotClass} ${FRESHNESS_STYLE[freshness].pulse ? 'shadow-glow' : ''}`}
        />
        {t(FRESHNESS_STYLE[freshness].labelKey)}
      </div>
    </div>
  );
}
