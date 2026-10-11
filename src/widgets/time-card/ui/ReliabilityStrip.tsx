import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Bucket } from '@/entities/weather/model/reliability';
import { cn } from '@/shared/lib/cn';

const BAR: Record<Bucket, string> = {
  ok: 'h-full bg-status-safe/85',
  partial: 'h-[70%] bg-status-warning',
  // A silent minute is a short muted stub: visible on a dark card without competing with real data.
  gap: 'h-[30%] bg-(--text-muted)/50',
};

const DOT: Record<Bucket, string> = {
  ok: 'bg-status-safe',
  partial: 'bg-status-warning',
  gap: 'bg-(--text-muted)',
};

type ReliabilityStripProps = {
  buckets: Bucket[];
  /** Spoken summary, e.g. "52 of 60 minutes with data". */
  summary: string;
  /** Label of each minute ("12:41") for the tooltip, same length as `buckets`. */
  minuteLabels: string[];
};

/**
 * One bar per minute of the last hour: was the station reporting, reported a
 * little, or silent. A single tooltip follows the pointer (or a tap) instead of
 * 60 native titles, so it appears at once and matches the rest of the card.
 */
export function ReliabilityStrip({ buckets, summary, minuteLabels }: ReliabilityStripProps): React.JSX.Element {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const indexAt = (clientX: number): number | null => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const i = Math.floor(((clientX - rect.left) / rect.width) * buckets.length);
    return i >= 0 && i < buckets.length ? i : null;
  };

  const width = ref.current?.clientWidth ?? 0;
  const cell = buckets.length > 0 ? width / buckets.length : 0;
  const center = hover === null ? 0 : (hover + 0.5) * cell;

  return (
    <div className="relative">
      <div
        ref={ref}
        className="grid h-5 items-end gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
        role="img"
        aria-label={summary}
        onPointerMove={(e) => setHover(indexAt(e.clientX))}
        onPointerDown={(e) => setHover(indexAt(e.clientX))}
        onPointerLeave={() => setHover(null)}
      >
        {buckets.map((bucket, i) => (
          <i
            key={i}
            className={cn(
              'block rounded-[1px] transition-[height,background-color,opacity] duration-500',
              BAR[bucket],
              hover !== null && hover !== i && 'opacity-60',
            )}
          />
        ))}
      </div>

      {hover !== null ? (
        <div
          className="pointer-events-none absolute bottom-full z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-(--glass-border) bg-(--surface) px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(center, 56), Math.max(56, width - 56)) }}
        >
          <span className="font-medium text-primary-themed [font-variant-numeric:tabular-nums]">{minuteLabels[hover] ?? ''}</span>
          <span className="mx-1.5 text-muted-themed">·</span>
          <span className="inline-flex items-center gap-1.5 text-secondary-themed">
            <span className={cn('h-1.5 w-1.5 rounded-full', DOT[buckets[hover]!])} aria-hidden />
            {t(`strip_minute_${buckets[hover]!}`)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
