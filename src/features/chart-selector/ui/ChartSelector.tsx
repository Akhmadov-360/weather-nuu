import { useTranslation } from 'react-i18next';
import { SENSOR_ORDER } from '@/entities/weather/model/weather.constants';
import type { SensorType } from '@/entities/weather/model/weather.types';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';

type ChartSelectorProps = {
  active: SensorType;
  onChange: (sensor: SensorType) => void;
};

export function ChartSelector({ active, onChange }: ChartSelectorProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2">
      {SENSOR_ORDER.map((sensor) => (
        <Button
          key={sensor}
          variant={active === sensor ? 'default' : 'outline'}
          size="sm"
          className={cn('min-w-20')}
          onClick={() => onChange(sensor)}
        >
          {t(`btn_${sensor}`)}
        </Button>
      ))}
    </div>
  );
}
