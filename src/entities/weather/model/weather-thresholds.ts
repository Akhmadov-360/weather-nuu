import { SENSOR_RANGES } from "@/shared/lib/weather-ranges";
import type { SensorType } from "./weather.types";

export type MetricTone = "good" | "warn" | "bad" | "neutral";

export type MetricStatus = {
  labelKey: string;
  tone: MetricTone;
};

const TEMP_RANGE = { min: 20, max: 24 };
const HUM_RANGE = { min: 30, max: 60 };

/**
 * Safe/warn boundary for a green→yellow→red sensor is the same "to" the
 * range-bar zones use — derived here, not duplicated, so this status can
 * never disagree with where the Slider marker actually sits (that's
 * exactly the bug this replaced: mq5/mq3 had their own hand-picked
 * thresholds here that drifted away from SENSOR_RANGES over time).
 */
function getZoneStatus(sensor: "mq5" | "mq3", value: number): MetricStatus {
  const [safe, warn] = SENSOR_RANGES[sensor].zones;
  if (value <= safe!.to) return { labelKey: "status_safe", tone: "good" };
  if (value <= warn!.to) return { labelKey: "status_warning", tone: "warn" };
  return { labelKey: "status_high", tone: "bad" };
}

export function getSensorStatus(sensor: SensorType, value: number | null): MetricStatus {
  if (value == null || Number.isNaN(value)) {
    return { labelKey: "status_reference", tone: "neutral" };
  }

  switch (sensor) {
    case "temp":
      if (value < TEMP_RANGE.min) return { labelKey: "status_below_norm", tone: "warn" };
      if (value > TEMP_RANGE.max) return { labelKey: "status_above_norm", tone: "warn" };
      return { labelKey: "status_normal", tone: "good" };

    case "hum":
      if (value < HUM_RANGE.min) return { labelKey: "status_low", tone: "warn" };
      if (value > HUM_RANGE.max) return { labelKey: "status_high", tone: "warn" };
      return { labelKey: "status_normal", tone: "good" };

    case "press":
      return { labelKey: "status_reference", tone: "neutral" };

    case "mq5":
      return getZoneStatus("mq5", value);

    case "mq3":
      return getZoneStatus("mq3", value);
  }
}

export function getTempDeltaFromNorm(value: number | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (value < TEMP_RANGE.min) return +(TEMP_RANGE.min - value).toFixed(2);
  if (value > TEMP_RANGE.max) return +(value - TEMP_RANGE.max).toFixed(2);
  return 0;
}
