import type { SensorType } from "./weather.types";

export type MetricTone = "good" | "warn" | "bad" | "neutral";

export type MetricStatus = {
  labelKey: string;
  tone: MetricTone;
};

const TEMP_RANGE = { min: 20, max: 24 };
const HUM_RANGE = { min: 30, max: 60 };

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
      if (value <= 100) return { labelKey: "status_safe", tone: "good" };
      if (value <= 300) return { labelKey: "status_warning", tone: "warn" };
      return { labelKey: "status_high", tone: "bad" };

    case "mq3":
      if (value <= 5) return { labelKey: "status_safe", tone: "good" };
      if (value <= 20) return { labelKey: "status_warning", tone: "warn" };
      return { labelKey: "status_high", tone: "bad" };
  }
}

export function getTempDeltaFromNorm(value: number | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (value < TEMP_RANGE.min) return +(TEMP_RANGE.min - value).toFixed(2);
  if (value > TEMP_RANGE.max) return +(value - TEMP_RANGE.max).toFixed(2);
  return 0;
}
