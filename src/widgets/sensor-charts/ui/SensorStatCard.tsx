import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';

import type { MetricTone } from '@/entities/weather/model/weather-thresholds';
import { AnimateNumber } from '@/shared/ui/animate-number';
import { StatusText } from '@/shared/ui/status-text';

export type StatCardType = 'current' | 'min' | 'max' | 'avg';

type SensorStatCardProps = {
  type: StatCardType;
  label: string;
  value: number | null;
  unit?: string;
  hint: string;
  tone?: MetricTone;
};

/** Min and max read at a glance by colour, as on the temperature card: cool for the low, warm for the high. */
const MARK: Partial<Record<StatCardType, { Icon: LucideIcon; className: string }>> = {
  min: { Icon: ArrowDown, className: 'text-(--status-info)' },
  max: { Icon: ArrowUp, className: 'text-(--status-critical)' },
};

/**
 * One cell of the statistics strip under the chart. The cells share a single
 * card (see SensorCharts), so there is no frame or icon here, only the label,
 * the number and what it means.
 */
export function SensorStatCard({ type, label, value, unit, hint, tone = 'neutral' }: SensorStatCardProps): React.JSX.Element {
  const mark = MARK[type];

  return (
    <div className="flex min-w-0 flex-col bg-(--glass-surface) px-4 py-4 sm:px-5">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-themed">{label}</div>

      <div className="mt-2 flex items-end gap-1.5">
        {mark ? <mark.Icon className={`mb-1 h-4 w-4 shrink-0 ${mark.className}`} strokeWidth={2.4} aria-hidden /> : null}
        <span className="text-4xl leading-none font-semibold tracking-tight text-primary-themed [font-variant-numeric:proportional-nums]">
          {value != null ? <AnimateNumber value={value} fractionDigits={1} /> : '—'}
        </span>
        {unit ? <span className="pb-0.5 text-base text-muted-themed">{unit}</span> : null}
      </div>

      <div className="mt-2.5">
        {type === 'min' || type === 'max' ? (
          <span className="text-[13px] text-muted-themed">{hint}</span>
        ) : (
          <StatusText tone={tone} className="text-[13px]">
            {hint}
          </StatusText>
        )}
      </div>
    </div>
  );
}
