import type { WeatherPageType } from '@/shared/types/common';

export type SensorType = 'temp' | 'hum' | 'press' | 'mq5' | 'mq3';

export type WeatherLatest = {
  temp: number;
  hum: number;
  press: number;
  mq5: number;
  mq3: number;
  date: string;
};

export type WeatherHistoryItem = WeatherLatest;

export type WeatherApiPaths = {
  latest: string;
  history: string;
};

export type DashboardPageConfig = {
  key: WeatherPageType;
  titleKey: string;
  navKey: string;
  oppositeNavKey: string;
  oppositePath: string;
  api: WeatherApiPaths;
};
