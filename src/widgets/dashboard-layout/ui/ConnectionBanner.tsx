import { RadioTower, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { splitAge, type ConnectionState } from '@/entities/weather/model/connection';
import { STATION } from '@/shared/config/station';

function formatLastSeen(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: STATION.timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(ms)
    .replace(',', '')
    .replaceAll('/', '.');
}

/** A flat signal line with a single beat of the cursor: the station is there, but silent. */
function FlatSignal(): React.JSX.Element {
  return (
    <svg className="hidden h-10 w-24 shrink-0 text-(--text-muted) sm:block" viewBox="0 0 96 40" fill="none" aria-hidden>
      <path d="M0 20 H96" stroke="currentColor" strokeOpacity=".45" strokeDasharray="2 5" />
      <path d="M0 20 H30 l4 -9 l6 18 l4 -9 H96" stroke="currentColor" strokeOpacity=".25" />
      <circle cx="88" cy="20" r="3.5" fill="var(--status-warning)" className="motion-safe:animate-pulse" />
    </svg>
  );
}

/**
 * Shown above the cards when the data is not live. Two different problems get
 * two messages: the station stopped reporting, or this browser cannot reach
 * the server. If both are true the connection problem comes first, since
 * nothing else can be said about the station.
 */
export function ConnectionBanner({ connection }: { connection: ConnectionState }): React.JSX.Element | null {
  const { t } = useTranslation();
  const linkLost = !connection.linkOk;
  const silent = connection.level === 'archive';
  if (!linkLost && !silent) return null;

  const Icon = linkLost ? WifiOff : RadioTower;
  const age = connection.ageMs === null ? null : splitAge(connection.ageMs);
  const ago = age ? t(`age_ago_${age.unit}`, { n: age.n }) : null;

  return (
    <div role="status" className="flex items-center gap-4 rounded-card border border-(--glass-border) bg-(--glass-surface) p-4 shadow-card sm:px-5">
      <div className="shrink-0 rounded-xl border border-(--glass-border) bg-(--glass-surface-hover) p-2.5 text-secondary-themed">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-primary-themed sm:text-base">
          {linkLost ? t('conn_link_title') : t('conn_silent_title')}
        </div>
        <div className="mt-0.5 text-xs text-secondary-themed sm:text-sm">
          {linkLost
            ? t('conn_link_desc')
            : connection.lastSeenMs === null
              ? t('conn_silent_never')
              : t('conn_silent_desc', { time: formatLastSeen(connection.lastSeenMs), ago })}
        </div>
      </div>
      {silent && !linkLost ? <FlatSignal /> : null}
    </div>
  );
}
