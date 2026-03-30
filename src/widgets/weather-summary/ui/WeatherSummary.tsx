import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Sun, Cloud, CloudRain, CloudSnow, CloudFog } from "lucide-react";
import type { WeatherLatest, WeatherHistoryItem } from "@/entities/weather/model/weather.types";

type WeatherSummaryProps = {
  latest: WeatherLatest;
  history?: WeatherHistoryItem[];
};

type MetricProps = {
  label: string;
  value: number | null | undefined;
  unit?: string;
};

function formatValue(value: number | null | undefined) {
  if (value == null) return "—";
  return Number.isInteger(value) ? value : value.toFixed(2);
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
function Metric({ label, value, unit }: MetricProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-md">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-300/60">{label}</div>

      <div className="mt-1 text-lg font-medium">
        {formatValue(value)} {unit}
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
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur-xl sm:p-6"
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col justify-between">
          <span className="text-xs uppercase tracking-[0.25em] text-slate-300/60">{t("current_weather")}</span>

          <div className="flex items-center gap-4">
            <Icon className="h-12 w-12 text-yellow-300 sm:h-14 sm:w-14" />

            <div>
              <div className="text-4xl font-semibold tracking-tight sm:text-5xl">{formatValue(latest.temp)}°C</div>

              <div className="mt-1 text-sm text-slate-300/70 sm:text-base">{t(weather.label)}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-slate-300/70">
            <span>↓ {min ?? "—"}°C</span>
            <span>↑ {max ?? "—"}°C</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <Metric label={t("lbl_hum")} value={latest.hum} unit="%" />
          <Metric label={t("lbl_press")} value={latest.press} unit="hPa" />
          <Metric label={t("lbl_mq5")} value={latest.mq5} />
          <Metric label={t("lbl_mq3")} value={latest.mq3} />
        </div>
      </div>
    </motion.section>
  );
}
