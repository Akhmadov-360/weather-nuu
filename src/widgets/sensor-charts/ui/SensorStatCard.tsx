import { motion } from 'framer-motion';
import { Maximize2, Minimize2, Sigma, Thermometer } from 'lucide-react';

import type { MetricTone } from '@/entities/weather/model/weather-thresholds';
import { AnimateNumber } from '@/shared/ui/animate-number';
import { getToneTextClass } from '@/shared/lib/sensor-format';

export type StatCardType = 'current' | 'min' | 'max' | 'avg';

type SensorStatCardProps = {
  type: StatCardType;
  label: string;
  value: number | null;
  unit?: string;
  hint: string;
  tone?: MetricTone;
};

const STAT_ICONS: Record<StatCardType, React.ElementType> = {
  current: Thermometer,
  min:     Minimize2,
  max:     Maximize2,
  avg:     Sigma,
};

export function SensorStatCard({
  type,
  label,
  value,
  unit,
  hint,
  tone = 'neutral',
}: SensorStatCardProps): React.JSX.Element {
  const Icon = STAT_ICONS[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="border px-4 py-4"
      style={{
        borderRadius: '16px',
        backgroundColor: 'var(--glass-surface-soft)',
        borderColor: 'var(--glass-border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-themed">{label}</div>
        <div
          className="rounded-xl border p-2 text-secondary-themed"
          style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-surface)' }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-end gap-1">
        <span className="text-3xl font-semibold tracking-tight text-primary-themed">
          {value != null ? <AnimateNumber value={value} fractionDigits={1} /> : '—'}
        </span>
        {unit ? <span className="pb-1 text-sm text-muted-themed">{unit}</span> : null}
      </div>

      <div className={`mt-2 text-sm ${getToneTextClass(tone)}`}>{hint}</div>
    </motion.div>
  );
}
