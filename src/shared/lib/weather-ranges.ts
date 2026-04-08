import { SensorType } from "../../entities/weather/model/weather.types";

export type RangeZoneColor = "green" | "yellow" | "red" | "blue";

export type RangeZone = {
  from: number;
  to: number;
  color: RangeZoneColor;
  labelKey: string;
};

export type SensorRangeConfig = {
  min: number;
  max: number;
  unit?: string;
  normLabelKey: string;
  zones: RangeZone[];
};

export const SENSOR_RANGES: Record<SensorType, SensorRangeConfig> = {
  temp: {
    min: 0,
    max: 40,
    unit: "°C",
    normLabelKey: "range_temp_norm",
    zones: [
      { from: 0, to: 20, color: "blue", labelKey: "range_temp_cold" },
      { from: 20, to: 24, color: "green", labelKey: "range_temp_ok" },
      { from: 24, to: 40, color: "red", labelKey: "range_temp_hot" },
    ],
  },
  hum: {
    min: 0,
    max: 100,
    unit: "%",
    normLabelKey: "range_hum_norm",
    zones: [
      { from: 0, to: 30, color: "blue", labelKey: "range_hum_low" },
      { from: 30, to: 60, color: "green", labelKey: "range_hum_ok" },
      { from: 60, to: 100, color: "red", labelKey: "range_hum_high" },
    ],
  },
  press: {
    min: 900,
    max: 1100,
    unit: "hPa",
    normLabelKey: "range_press_norm",
    zones: [
      { from: 900, to: 940, color: "red", labelKey: "range_press_low" },
      { from: 940, to: 1040, color: "green", labelKey: "range_press_ok" },
      { from: 1040, to: 1100, color: "red", labelKey: "range_press_high" },
    ],
  },
  mq5: {
    min: 0,
    max: 3000,
    unit: "ppm",
    normLabelKey: "range_mq5_norm",
    zones: [
      { from: 0, to: 1000, color: "green", labelKey: "range_mq5_ok" },
      { from: 1000, to: 2000, color: "yellow", labelKey: "range_mq5_warn" },
      { from: 2000, to: 3000, color: "red", labelKey: "range_mq5_bad" },
    ],
  },
  mq3: {
    min: 0,
    max: 1500,
    unit: "мкг/м³",
    normLabelKey: "range_mq3_norm",
    zones: [
      { from: 0, to: 100, color: "green", labelKey: "range_mq3_ok" },
      { from: 100, to: 500, color: "yellow", labelKey: "range_mq3_warn" },
      { from: 500, to: 1500, color: "red", labelKey: "range_mq3_bad" },
    ],
  },
};
