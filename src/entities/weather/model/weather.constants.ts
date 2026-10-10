import type { DashboardPageConfig } from "./weather.types";
import { ENV } from "@/shared/config/env";

export const ROOM_CONFIG: DashboardPageConfig = {
  key: "room",
  titleKey: "panel_room",
  navKey: "nav_room",
  oppositeNavKey: "nav_street",
  oppositePath: "/street",
  api: {
    latest: ENV.endpoints.room.latest,
    history: ENV.endpoints.room.history,
  },
};

export const STREET_CONFIG: DashboardPageConfig = {
  key: "street",
  titleKey: "panel_street",
  navKey: "nav_street",
  oppositeNavKey: "nav_room",
  oppositePath: "/room",
  api: {
    latest: ENV.endpoints.street.latest,
    history: ENV.endpoints.street.history,
  },
};
