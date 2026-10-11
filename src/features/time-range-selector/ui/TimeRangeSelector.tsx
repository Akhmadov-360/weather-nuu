import { useTranslation } from 'react-i18next';

import RubberSegment from '@/components/ui/rubber-segment';
import type { TimeRange } from '@/shared/lib/date/filter-by-range';

type TimeRangeSelectorProps = {
  /** null means no preset is active — e.g. a custom calendar range is in use instead. */
  value: TimeRange | null;
  onChange: (range: TimeRange) => void;
};

const RANGES: TimeRange[] = ['1h', '6h', '24h', '7d', '30d', '90d'];

const RANGE_KEYS: Record<TimeRange, string> = {
  '1h': 'range_1h',
  '6h': 'range_6h',
  '24h': 'range_24h',
  '7d': 'range_7d',
  '30d': 'range_30d',
  '90d': 'range_90d',
};

/** The period presets as one stretchy segmented control: the thumb can be dragged or flicked as well as tapped. */
export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <RubberSegment
      aria-label={t('chart_history_title')}
      items={RANGES.map((range) => ({ value: range, label: t(RANGE_KEYS[range]) }))}
      value={value}
      onChange={(next) => onChange(next as TimeRange)}
      size="sm"
      radius={11}
      inset={3}
      trackColor="var(--glass-surface-soft)"
      thumbColor="var(--control-active)"
      textColor="var(--text-muted)"
      activeTextColor="var(--text-primary)"
      className="border border-(--glass-border)"
    />
  );
}
