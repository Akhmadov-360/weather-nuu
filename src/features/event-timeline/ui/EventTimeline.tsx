import { BadgeCheck, Brush, LogIn, LogOut, Snowflake, Wind, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InfoCard, InfoCardSkeleton } from '@/shared/ui/info-card';
import { InfoHint } from '@/shared/ui/info-hint';
import { formatStationDate, formatStationTime } from '@/widgets/time-card/model/station-time';
import { useRoomEventsQuery } from '../api/events.queries';
import { hasLittleData, latestEvents, type EventClass, type RoomEvent } from '../model/events';

const ICONS: Record<EventClass, LucideIcon> = {
  ventilation: Wind,
  ac: Snowflake,
  cleaning: Brush,
  class_start: LogIn,
  class_end: LogOut,
};

/** "14:20", and with the date when the event is not from today of the station. */
function whenText(startIso: string, nowMs: number, language: string): string {
  const start = Date.parse(startIso);
  const time = formatStationTime(start);
  const date = formatStationDate(start, language);
  if (date === formatStationDate(nowMs, language)) return time;
  // The date comes as "weekday, day month"; the list needs only "day month".
  return `${date.split(', ').slice(1).join(', ') || date}, ${time}`;
}

function Row({ event, nowMs }: { event: RoomEvent; nowMs: number }): React.JSX.Element {
  const { t, i18n } = useTranslation('events');
  const Icon = ICONS[event.cls];
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--glass-border)/40 text-secondary-themed">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-primary-themed">{t(`events_class_${event.cls}`)}</span>
        {event.confirmedByStreet ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-themed">
            <BadgeCheck aria-hidden="true" className="size-3.5" />
            {t('events_confirmed')}
          </span>
        ) : null}
      </span>
      <time dateTime={event.start} className="shrink-0 text-sm tabular-nums text-secondary-themed">
        {whenText(event.start, nowMs, i18n.language)}
      </time>
    </li>
  );
}

/**
 * The last events of the auditorium that the platform found in the readings: an open window, cleaning, the air
 * conditioner. Compact, in the shape of the cards of the sensors, on the page of the room only. That the events are found
 * by the system and not written by people is said in the (i) of the card; an empty list says whether the day had readings.
 * If the request fails the card is not shown: the dashboard works without it.
 */
export function EventTimeline({ enabled }: { enabled: boolean }): React.JSX.Element | null {
  const { t } = useTranslation('events');
  const query = useRoomEventsQuery(enabled);
  const data = query.data;

  if (!enabled || query.isError || data === null) return null;
  if (query.isLoading || !data) return <InfoCardSkeleton />;

  const { shown, hidden } = latestEvents(data.events);
  const nowMs = Date.now();
  return (
    <InfoCard label={t('events_title')} hint={<InfoHint label={t('events_info_label')}><p>{t('events_method')}</p></InfoHint>}>
      {shown.length > 0 ? (
        <ul className="mt-2 divide-y divide-(--glass-border)/50">
          {shown.map((event) => (
            <Row key={`${event.cls}-${event.start}`} event={event} nowMs={nowMs} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[13px] leading-snug text-secondary-themed">{hasLittleData(data) ? t('events_little_data') : t('events_none')}</p>
      )}
      {hidden > 0 ? <p className="mt-auto pt-2 text-[11px] text-muted-themed">{t('events_more', { count: hidden })}</p> : null}
    </InfoCard>
  );
}
