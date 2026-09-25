import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import type { TimeRange } from '@/shared/lib/date/filter-by-range';

type TimeRangeSelectorProps = {
  /** null means no preset is active — e.g. a custom calendar range is in use instead. */
  value: TimeRange | null;
  onChange: (range: TimeRange) => void;
};

const RANGES: TimeRange[] = ['1h', '6h', '24h', '7d', '30d', '90d'];

const RANGE_KEYS: Record<TimeRange, string> = {
  '1h':  'range_1h',
  '6h':  'range_6h',
  '24h': 'range_24h',
  '7d':  'range_7d',
  '30d': 'range_30d',
  '90d': 'range_90d',
};

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center gap-0.5 rounded-xl border p-1"
      style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-surface-soft)' }}
    >
      {RANGES.map((range) => {
        const isActive = value === range;
        return (
          <button
            key={range}
            onClick={() => onChange(range)}
            className={cn(
              'relative cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors sm:text-xs',
              isActive ? 'text-primary-themed' : 'text-muted-themed hover:text-secondary-themed',
            )}
          >
            {isActive && (
              <motion.div
                layoutId="time-range-active"
                className="absolute inset-0 rounded-lg"
                style={{ backgroundColor: 'var(--glass-surface-hover)' }}
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              />
            )}
            <span className="relative z-10">{t(RANGE_KEYS[range])}</span>
          </button>
        );
      })}
    </div>
  );
}
