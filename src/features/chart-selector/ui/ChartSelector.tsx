import { useTranslation } from 'react-i18next';
import { Thermometer, Droplets, Wind, Flame, Wine, CloudFog, Cloudy } from 'lucide-react';

import RubberSegment from '@/components/ui/rubber-segment';
import type { SensorType } from '@/entities/weather/model/weather.types';

type ChartSelectorProps = {
  /** Tabs to offer, in order — what the current source physically has (SENSORS_BY_SOURCE). */
  sensors: SensorType[];
  active: SensorType;
  onChange: (sensor: SensorType) => void;
};

const SENSOR_ICONS: Record<SensorType, React.ElementType> = {
  temp: Thermometer,
  hum: Droplets,
  press: Wind,
  mq5: Flame,
  mq3: Wine,
  pm25: CloudFog,
  pm10: Cloudy,
};

/**
 * One tab per sensor. On phones the row scrolls sideways and shows short
 * names; the thumb can be dragged between tabs as well as tapped.
 */
export function ChartSelector({ sensors, active, onChange }: ChartSelectorProps): React.JSX.Element {
  const { t } = useTranslation();

  const items = sensors.map((sensor) => {
    const Icon = SENSOR_ICONS[sensor];
    return {
      value: sensor,
      icon: <Icon className="h-4 w-4 shrink-0" style={{ color: `var(--sensor-${sensor})` }} aria-hidden />,
      label: (
        <>
          <span className="sm:hidden">{t(`btn_${sensor}_short`)}</span>
          <span className="hidden sm:inline">{t(`btn_${sensor}`)}</span>
        </>
      ),
    };
  });

  return (
    <div className="tabs-scroll relative w-full overflow-x-auto pb-1">
      <RubberSegment
        aria-label={t('chart_history_title')}
        items={items}
        value={active}
        onChange={(next) => onChange(next as SensorType)}
        draggable={false}
        size="lg"
        radius={16}
        inset={4}
        trackColor="var(--glass-surface-soft)"
        thumbColor="var(--control-active)"
        textColor="var(--text-muted)"
        activeTextColor="var(--text-primary)"
        className="w-max min-w-full border border-(--glass-border) [&>button]:min-w-[84px] sm:[&>button]:min-w-[110px]"
      />
    </div>
  );
}
