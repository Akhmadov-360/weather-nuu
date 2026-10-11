import { useTranslation } from 'react-i18next';

import { useConnection } from '@/entities/weather/model/connection-context';
import { splitAge } from '@/entities/weather/model/connection';
import { STATION } from '@/shared/config/station';

/** "19:17", or "10.10 19:17" when the reading is from another day, in the station's time zone. */
function clock(ms: number, now: number): string {
  const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: STATION.timeZone, ...opts });
  const time = fmt({ hour: '2-digit', minute: '2-digit', hour12: false }).format(ms);
  const day = (v: number) => fmt({ day: '2-digit', month: '2-digit' }).format(v);
  return day(ms) === day(now) ? time : `${day(ms)} ${time}`;
}

/**
 * A small note on a card when its values are not live: how long ago they were
 * taken; in archive mode also the time of the last reading.
 */
export function AgeMark({ className }: { className?: string }): React.JSX.Element | null {
  const { t } = useTranslation();
  const { level, ageMs, lastSeenMs } = useConnection();
  if (level === 'live') return null;
  const age = ageMs === null ? null : t(`age_ago_${splitAge(ageMs).unit}`, { n: splitAge(ageMs).n });
  const text = level === 'archive' && lastSeenMs !== null ? `${clock(lastSeenMs, Date.now())} · ${age}` : age;
  if (!text) return null;
  return <span className={`shrink-0 text-[11px] text-muted-themed ${className ?? ''}`}>{text}</span>;
}
