import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Thermometer, Droplets, Wind, ShieldCheck, SprayCan } from 'lucide-react';

import { SENSOR_ORDER } from '@/entities/weather/model/weather.constants';
import type { SensorType } from '@/entities/weather/model/weather.types';
import { cn } from '@/shared/lib/cn';
import { SENSOR_COLORS } from '@/shared/lib/chart/chart-colors';

type ChartSelectorProps = {
  active: SensorType;
  onChange: (sensor: SensorType) => void;
};

const SENSOR_ICONS: Record<SensorType, React.ReactNode> = {
  temp:  <Thermometer className="h-4 w-4" />,
  hum:   <Droplets    className="h-4 w-4" />,
  press: <Wind        className="h-4 w-4" />,
  mq5:   <ShieldCheck className="h-4 w-4" />,
  mq3:   <SprayCan    className="h-4 w-4" />,
};

export function ChartSelector({ active, onChange }: ChartSelectorProps): React.JSX.Element {
  const { t } = useTranslation();

  const MOBILE_LABELS: Record<SensorType, string> = {
    temp:  t('btn_temp_short'),
    hum:   t('btn_hum_short'),
    press: t('btn_press_short'),
    mq5:   t('btn_mq5_short'),
    mq3:   t('btn_mq3_short'),
  };

  return (
    <div className="relative w-full overflow-x-auto pb-1">
      <div
        className="flex w-max min-w-full items-center gap-1 rounded-2xl border p-1 backdrop-blur-xl"
        style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-surface-soft)' }}
      >
        {SENSOR_ORDER.map((sensor) => {
          const isActive = active === sensor;
          return (
            <button
              key={sensor}
              onClick={() => onChange(sensor)}
              className={cn(
                'relative flex min-w-[82px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all sm:min-w-[110px] sm:px-4 sm:text-sm',
                isActive ? 'text-primary-themed' : 'text-muted-themed hover:text-secondary-themed',
              )}
            >
              {isActive ? (
                <motion.div
                  layoutId="chart-selector-active"
                  className="absolute inset-0 rounded-xl"
                  style={{ backgroundColor: `${SENSOR_COLORS[sensor]}22` }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                />
              ) : null}

              <span className="relative z-10 shrink-0" style={{ color: SENSOR_COLORS[sensor] }}>
                {SENSOR_ICONS[sensor]}
              </span>

              <span className="relative z-10 whitespace-nowrap sm:hidden">
                {MOBILE_LABELS[sensor]}
              </span>
              <span className="relative z-10 hidden whitespace-nowrap sm:inline">
                {t(`btn_${sensor}`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
