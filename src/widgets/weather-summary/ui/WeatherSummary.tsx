import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Sun, Cloud, CloudRain, CloudSnow, CloudFog, Droplets, Gauge, ShieldCheck, SprayCan } from "lucide-react";

import type { WeatherLatest, WeatherHistoryItem, SensorType } from "@/entities/weather/model/weather.types";
import { getSensorStatus, getTempDeltaFromNorm, type MetricTone } from "@/entities/weather/model/weather-thresholds";

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

function Metric({ sensor, label, value, unit }: MetricProps) {
  const { t } = useTranslation();
  const status = getSensorStatus(sensor, value ?? null);
  const Icon = getMetricIcon(sensor);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-md sm:px-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-[10px] uppercase tracking-[0.2em] text-slate-300/60 sm:text-[11px]">{label}</div>

        <div className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300/80">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-2 flex items-end gap-1">
        <span className="text-base font-semibold text-white sm:text-lg">{formatValue(value)}</span>
        {unit ? <span className="pb-[2px] text-[11px] text-slate-400 sm:text-xs">{unit}</span> : null}
      </div>

      <div className={`mt-2 text-[11px] sm:text-xs ${getToneClass(status.tone)}`}>{t(status.labelKey)}</div>
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
      className="rounded-[28px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl sm:p-6"
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:gap-6">
        <div className="flex flex-col justify-between rounded-[24px] p-4 sm:p-5">
          <span className="text-[10px] uppercase tracking-[0.25em] text-slate-300/60 sm:text-xs">
            {t("current_weather")}
          </span>

          <div className="mt-4 flex items-center gap-3 sm:gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
              <Icon className="h-10 w-10 text-yellow-300 sm:h-12 sm:w-12" />
            </div>

            <div className="min-w-0">
              <div className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                {formatValue(latest.temp)}°C
              </div>

              <div className="mt-1 text-sm text-slate-300/70 sm:text-base">{t(weather.label)}</div>

              <div className={`mt-2 text-xs sm:text-sm ${getToneClass(tempStatus.tone)}`}>{tempHint}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300/70 sm:text-sm">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">↓ {min ?? "—"}°C</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">↑ {max ?? "—"}°C</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric sensor="hum" label={t("lbl_hum")} value={latest.hum} unit="%" />
          <Metric sensor="press" label={t("lbl_press")} value={latest.press} unit="hPa" />
          <Metric sensor="mq5" label={t("lbl_mq5")} value={latest.mq5} />
          <Metric sensor="mq3" label={t("lbl_mq3")} value={latest.mq3} />
        </div>
      </div>
    </motion.section>
  );
}
