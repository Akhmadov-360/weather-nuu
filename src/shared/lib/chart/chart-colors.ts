import type { SensorType } from '@/entities/weather/model/weather.types';

export const SENSOR_COLORS: Record<SensorType, string> = {
  temp: '#ef4444',
  hum: '#0ea5e9',
  press: '#6366f1',
  mq5: '#f59e0b',
  mq3: '#22c55e',
};
