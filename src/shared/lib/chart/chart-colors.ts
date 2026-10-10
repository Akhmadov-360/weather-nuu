import type { SensorType } from '@/shared/types/sensor';

export const SENSOR_COLORS: Record<SensorType, string> = {
  temp: '#ef4444',
  hum: '#0ea5e9',
  press: '#6366f1',
  mq5: '#f59e0b',
  mq3: '#22c55e',
  pm25: '#a855f7',
  pm10: '#fb923c',
};
