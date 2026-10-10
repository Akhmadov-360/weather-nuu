import { useTranslation } from 'react-i18next';

import type { Bucket } from '@/entities/weather/model/reliability';
import { cn } from '@/shared/lib/cn';

const BAR: Record<Bucket, string> = {
  ok: 'h-full bg-status-safe/85',
  partial: 'h-[70%] bg-status-warning',
  gap: 'h-[35%] bg-(--control-track)',
};

type ReliabilityStripProps = {
  buckets: Bucket[];
  /** Spoken summary, e.g. "52 of 60 minutes with data". */
  summary: string;
  /** Label of each minute ("12:41") for the hover title, same length as `buckets`. */
  minuteLabels: string[];
};

/** One bar per minute of the last hour: was the station reporting, reported a little, or silent. */
export function ReliabilityStrip({ buckets, summary, minuteLabels }: ReliabilityStripProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="grid h-5 items-end gap-[2px]" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }} role="img" aria-label={summary}>
      {buckets.map((bucket, i) => (
        <i
          key={i}
          title={`${minuteLabels[i] ?? ''} · ${t(`strip_minute_${bucket}`)}`}
          className={cn('block rounded-[1px] transition-[height,background-color] duration-500', BAR[bucket])}
        />
      ))}
    </div>
  );
}
