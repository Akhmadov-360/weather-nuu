import { ENV } from '@/shared/config/env';
import { ROUTES } from '@/shared/config/routes';
import type { DashboardPageConfig, SensorType } from './weather.types';

export const SENSOR_ORDER: SensorType[] = ['temp', 'hum', 'press', 'mq5', 'mq3'];

export const ROOM_CONFIG: DashboardPageConfig = {
  key: 'room',
  titleKey: 'panel_room',
  navKey: 'nav_room',
  oppositeNavKey: 'nav_street',
  oppositePath: ROUTES.street,
  api: {
    latest: ENV.roomLatestPath,
    history: ENV.roomHistoryPath,
  },
};

export const STREET_CONFIG: DashboardPageConfig = {
  key: 'street',
  titleKey: 'panel_street',
  navKey: 'nav_street',
  oppositeNavKey: 'nav_room',
  oppositePath: ROUTES.room,
  api: {
    latest: ENV.streetLatestPath,
    history: ENV.streetHistoryPath,
  },
};
