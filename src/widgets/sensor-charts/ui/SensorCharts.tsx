import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import type { SensorType, WeatherHistoryItem } from '@/entities/weather/model/weather.types';
import { SENSOR_COLORS } from '@/shared/lib/chart/chart-colors';
import { formatChartDate } from '@/shared/lib/date/format-date';
import { ChartSelector } from '@/features/chart-selector/ui/ChartSelector';

type SensorChartsProps = {
  history: WeatherHistoryItem[];
};

export function SensorCharts({ history }: SensorChartsProps): React.JSX.Element {
  const [activeSensor, setActiveSensor] = useState<SensorType>('temp');
  const { t } = useTranslation();

  const chartData = useMemo(
    () => history.map((item) => ({ ...item, shortDate: formatChartDate(item.date) })),
    [history],
  );

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{t(`btn_${activeSensor}`)}</CardTitle>
        <ChartSelector active={activeSensor} onChange={setActiveSensor} />
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="shortDate" minTickGap={30} />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey={activeSensor}
                stroke={SENSOR_COLORS[activeSensor]}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
