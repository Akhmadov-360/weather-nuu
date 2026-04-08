import { motion } from "framer-motion";
import { Cloud, CloudFog, CloudRain, CloudSnow, Droplets, Gauge, ShieldCheck, SprayCan, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getSensorStatus, getTempDeltaFromNorm, type MetricTone } from "@/entities/weather/model/weather-thresholds";
import type { SensorType, WeatherHistoryItem, WeatherLatest } from "@/entities/weather/model/weather.types";
import { AnimateNumber } from "@/shared/ui/animate-number";
import { RangeZoneColor, SENSOR_RANGES } from "../../../shared/lib/weather-ranges";

type WeatherSummaryProps = {
  latest: WeatherLatest;
  history?: WeatherHistoryItem[];
};

type MetricProps = {
  sensor: SensorType;
  label: string;
  value: number | null | undefined;
  unit?: string;
};

function formatValue(value: number | null | undefined) {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getWeatherCondition(temp?: number) {
  if (temp === undefined || temp === null) {
    return { label: "unknown", icon: Cloud };
  }

  if (temp >= 28) return { label: "sunny", icon: Sun };
  if (temp >= 18) return { label: "cloudy", icon: Cloud };
  if (temp >= 5) return { label: "rain", icon: CloudRain };
  if (temp >= -5) return { label: "fog", icon: CloudFog };

  return { label: "snow", icon: CloudSnow };
}

function getMetricIcon(sensor: SensorType) {
  switch (sensor) {
    case "hum":
      return Droplets;
    case "press":
      return Gauge;
    case "mq5":
      return ShieldCheck;
    case "mq3":
      return SprayCan;
    default:
      return Gauge;
  }
}

function getToneClass(tone: MetricTone) {
  switch (tone) {
    case "good":
      return "text-emerald-400";
    case "warn":
      return "text-amber-400";
    case "bad":
      return "text-rose-400";
    default:
      return "text-slate-400";
  }
}

function getZoneColorClass(color: RangeZoneColor) {
  switch (color) {
    case "green":
      return "bg-emerald-500";
    case "yellow":
      return "bg-amber-400";
    case "red":
      return "bg-rose-500";
    case "blue":
      return "bg-blue-400";
  }
}

function getMarkerColorClass(tone: MetricTone) {
  switch (tone) {
    case "good":
      return "bg-emerald-400";
    case "warn":
      return "bg-amber-400";
    case "bad":
      return "bg-rose-400";
    default:
      return "bg-slate-300";
  }
}

function Metric({ sensor, label, value, unit }: MetricProps) {
  const { t } = useTranslation();
  const status = getSensorStatus(sensor, value ?? null);
  const Icon = getMetricIcon(sensor);
  const range = SENSOR_RANGES[sensor];
  const displayUnit = unit ?? range.unit;
  const percent = value != null ? Math.min(100, Math.max(0, ((value - range.min) / (range.max - range.min)) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-[10px] uppercase tracking-[0.2em] text-slate-300/60 sm:text-[11px]">{label}</div>

        <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300/80">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-end gap-1.5">
        <span className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          {value != null ? <AnimateNumber value={value} fractionDigits={1} /> : "—"}
        </span>
        {displayUnit ? <span className="pb-[3px] text-xs text-slate-400">{displayUnit}</span> : null}
      </div>

      <div
        className={`mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] sm:text-xs ${getToneClass(status.tone)}`}
      >
        {t(status.labelKey)}
      </div>

      <div className="mt-4">
        <div className="relative h-2 rounded-full bg-gradient-to-r from-slate-800/50 to-slate-800/20">
          {range.zones.map((zone, index) => {
            const left = ((zone.from - range.min) / (range.max - range.min)) * 100;
            const width = ((zone.to - zone.from) / (range.max - range.min)) * 100;

            return (
              <motion.div
                key={index}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: `${width}%`, opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
                className={`absolute top-0 h-full rounded-full ${getZoneColorClass(zone.color)} shadow-inner`}
                style={{ left: `${left}%` }}
              />
            );
          })}

          <motion.div
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: `${percent}%`, marginLeft: "-3px" }}
            animate={{ left: `${percent}%` }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
          >
            <motion.div
              className="relative flex flex-col items-center"
              whileHover={{ scaleY: 1.3 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.div
                className={`absolute -inset-2 rounded-full ${getMarkerColorClass(status.tone)} opacity-20`}
                animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative h-5 w-1.5 rounded-full bg-white shadow-lg" />

              <div
                className={`absolute inset-x-[2px] top-1/2 h-3 w-1 rounded-full ${getMarkerColorClass(status.tone)} -translate-y-1/2`}
              />
            </motion.div>
          </motion.div>
        </div>

        <div className="mt-2 flex items-start justify-between gap-2 text-[11px] text-slate-400">
          <span>{range.min}</span>
          <span className="text-center">{t(range.normLabelKey)}</span>
          <span>{range.max}</span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-[11px] text-slate-400 sm:grid-cols-2">
        {range.zones.map((zone, index) => (
          <div key={index} className="flex items-start gap-1.5 leading-snug">
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${getZoneColorClass(zone.color)}`} />
            <span>{t(zone.labelKey)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getMinMax(latest?: number | null, history?: WeatherHistoryItem[]) {
  if (history && history.length > 0) {
    const temps = history.map((h) => h.temp).filter((v): v is number => v != null);
    if (temps.length > 0) {
      return {
        min: Math.min(...temps).toFixed(1),
        max: Math.max(...temps).toFixed(1),
      };
    }
  }

  if (typeof latest === "number") {
    return {
      min: (latest - 2).toFixed(1),
      max: (latest + 2).toFixed(1),
    };
  }

  return { min: null, max: null };
}

export function WeatherSummary({ latest, history }: WeatherSummaryProps): React.JSX.Element {
  const { t } = useTranslation();
  const weather = getWeatherCondition(latest.temp);
  const Icon = weather.icon;
  const { min, max } = getMinMax(latest.temp, history);
  const tempStatus = getSensorStatus("temp", latest.temp ?? null);
  const tempDelta = getTempDeltaFromNorm(latest.temp ?? null);

  const tempHint =
    tempDelta === null
      ? t("status_reference")
      : tempDelta === 0
        ? t("temp_delta_normal")
        : latest.temp > 24
          ? t("temp_delta_above", { value: tempDelta.toFixed(1) })
          : t("temp_delta_below", { value: tempDelta.toFixed(1) });

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl sm:p-5 lg:p-6"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between rounded-[24px] p-4 sm:p-5">
          <span className="text-[10px] uppercase tracking-[0.25em] text-slate-300/60 sm:text-xs">
            {t("current_weather")}
          </span>

          <div className="mt-4 flex items-center gap-3 sm:gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              <Icon className="h-10 w-10 text-yellow-300 sm:h-12 sm:w-12" />
            </div>

            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight text-white sm:text-4xl 2xl:text-5xl">
                {formatValue(latest.temp)}°C
              </div>

              <div className="mt-1 text-sm text-slate-300/70 sm:text-base">{t(weather.label)}</div>

              <div className={`mt-2 text-xs sm:text-sm ${getToneClass(tempStatus.tone)}`}>{tempHint}</div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-300/70 sm:text-sm">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">↓ {min ?? "—"}°C</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">↑ {max ?? "—"}°C</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Metric sensor="hum" label={t("lbl_hum")} value={latest.hum} />
          <Metric sensor="press" label={t("lbl_press")} value={latest.press} />
          <Metric sensor="mq5" label={t("lbl_mq5")} value={latest.mq5} />
          <Metric sensor="mq3" label={t("lbl_mq3")} value={latest.mq3} />
        </div>
      </div>
    </motion.section>
  );
}
