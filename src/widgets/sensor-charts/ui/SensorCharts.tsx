import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { Maximize2, Minimize2, Sigma, Thermometer } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { getSensorStatus, getTempDeltaFromNorm } from "@/entities/weather/model/weather-thresholds";
import type { SensorType, WeatherHistoryItem } from "@/entities/weather/model/weather.types";
import { ChartSelector } from "@/features/chart-selector/ui/ChartSelector";
import { SENSOR_COLORS } from "@/shared/lib/chart/chart-colors";
import { formatChartDate } from "@/shared/lib/date/format-date";
import { AnimateNumber } from "@/shared/ui/animate-number";

type SensorChartsProps = {
  history: WeatherHistoryItem[];
};

type ChartPoint = WeatherHistoryItem & {
  shortDate: string;
};

type StatTone = "good" | "warn" | "bad" | "neutral";

const SENSOR_UNITS: Record<SensorType, string> = {
  temp: "°C",
  hum: "%",
  press: "hPa",
  mq5: "",
  mq3: "",
};

function getStatIcon(type: "current" | "min" | "max" | "avg") {
  switch (type) {
    case "current":
      return Thermometer;
    case "min":
      return Minimize2;
    case "max":
      return Maximize2;
    case "avg":
      return Sigma;
  }
}

function getToneClass(tone: StatTone) {
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

function StatCard({
  type,
  label,
  value,
  unit,
  hint,
  tone = "neutral",
}: {
  type: "current" | "min" | "max" | "avg";
  label: string;
  value: number | null;
  unit?: string;
  hint: string;
  tone?: StatTone;
}) {
  const Icon = getStatIcon(type);
  const toneClass = getToneClass(tone);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="rounded-2xl  px-4 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300/80">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-end gap-1">
        <span className="text-3xl font-semibold tracking-tight text-white">
          {value != null ? <AnimateNumber value={value} fractionDigits={1} /> : "—"}
        </span>

        {unit ? <span className="pb-1 text-sm text-slate-400">{unit}</span> : null}
      </div>

      <div className={`mt-2 text-sm ${toneClass}`}>{hint}</div>
    </motion.div>
  );
}

export function SensorCharts({ history }: SensorChartsProps): React.JSX.Element {
  const [activeSensor, setActiveSensor] = useState<SensorType>("temp");
  const { t } = useTranslation();

  const recentPoints = useMemo(() => history.slice(-1000), [history]);

  const chartData = useMemo<ChartPoint[]>(
    () =>
      recentPoints.map((item) => ({
        ...item,
        shortDate: formatChartDate(item.date),
      })),
    [recentPoints],
  );

  const values = useMemo(
    () => chartData.map((item) => item[activeSensor]).filter((v): v is number => typeof v === "number"),
    [chartData, activeSensor],
  );

  const current = values.at(-1) ?? null;
  const prev = values.at(-2) ?? null;

  const trend =
    current != null && prev != null ? (current > prev ? "up" : current < prev ? "down" : "stable") : "stable";

  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

  const avgStatus = getSensorStatus(activeSensor, avg);
  const currentStatus = getSensorStatus(activeSensor, current);
  const tempDelta = activeSensor === "temp" ? getTempDeltaFromNorm(current) : null;

  const currentHint =
    activeSensor === "temp" && tempDelta !== null
      ? tempDelta === 0
        ? t("temp_delta_normal")
        : current != null && current > 24
          ? t("temp_delta_above", { value: tempDelta.toFixed(1) })
          : t("temp_delta_below", { value: tempDelta.toFixed(1) })
      : trend === "up"
        ? `↑ ${t("trend_rising")}`
        : trend === "down"
          ? `↓ ${t("trend_falling")}`
          : t("trend_stable");

  const option = useMemo<EChartsOption>(() => {
    const color = SENSOR_COLORS[activeSensor];
    const unit = SENSOR_UNITS[activeSensor];

    return {
      animationDuration: 350,
      animationEasing: "cubicOut",
      grid: {
        left: 16,
        right: 16,
        top: 24,
        bottom: 48,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        textStyle: {
          color: "#fff",
          fontSize: 12,
        },
        extraCssText: "backdrop-filter: blur(12px); border-radius: 12px;",
        formatter: (params: unknown) => {
          const point = Array.isArray(params) ? params[0] : params;
          const typedPoint = point as {
            value?: [string, number];
            axisValueLabel?: string;
          };

          const value = typedPoint?.value?.[1];
          const label = typedPoint?.axisValueLabel ?? "";
          const formatted =
            typeof value === "number" ? (Number.isInteger(value) ? String(value) : value.toFixed(2)) : "—";

          return `
            <div style="min-width: 120px;">
              <div style="margin-bottom: 6px; color: rgba(255,255,255,0.65);">${label}</div>
              <div style="font-weight: 600;">
                ${formatted}${unit ? ` ${unit}` : ""}
              </div>
            </div>
          `;
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: chartData.map((item) => item.shortDate),
        axisLine: {
          lineStyle: {
            color: "rgba(255,255,255,0.08)",
          },
        },
        axisTick: { show: false },
        axisLabel: {
          color: "rgba(255,255,255,0.45)",
          fontSize: 11,
          margin: 12,
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        splitLine: {
          lineStyle: {
            color: "rgba(255,255,255,0.05)",
          },
        },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "rgba(255,255,255,0.45)",
          fontSize: 11,
        },
      },
      dataZoom: [
        {
          type: "inside",
          throttle: 50,
          zoomLock: false,
        },
        {
          type: "slider",
          height: 18,
          bottom: 8,
          borderColor: "transparent",
          backgroundColor: "rgba(255,255,255,0.04)",
          fillerColor: "rgba(148,163,184,0.22)",
          handleSize: 0,
          moveHandleSize: 0,
          textStyle: {
            color: "rgba(255,255,255,0.35)",
          },
        },
      ],
      series: [
        {
          name: t(`btn_${activeSensor}`),
          type: "line",
          smooth: true,
          showSymbol: false,
          symbol: "circle",
          sampling: "lttb",
          lineStyle: {
            width: 3,
            color,
            shadowBlur: 14,
            shadowColor: color,
            shadowOffsetY: 4,
          },
          itemStyle: {
            color,
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${color}55` },
                { offset: 1, color: `${color}05` },
              ],
            },
          },
          emphasis: {
            focus: "series",
          },
          data: chartData.map((item) => [item.shortDate, item[activeSensor] ?? null]),
        },
      ],
    };
  }, [activeSensor, chartData, t]);

  return (
    <div className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/5 p-3 backdrop-blur-xl sm:p-4 lg:p-5">
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-blue-500" />
            <h3 className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-300/70 sm:text-xs">
              {t("chart_history_title")}
            </h3>
          </div>

          <span className="text-[11px] uppercase tracking-[0.24em] text-slate-400/60 sm:text-xs">
            {t("chart_last_points", { count: 1000 })}
          </span>
        </div>

        <ChartSelector active={activeSensor} onChange={setActiveSensor} />
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="h-[300px] w-full sm:h-[360px] lg:h-[420px]"
      >
        <ReactECharts
          option={option}
          notMerge
          lazyUpdate
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "canvas" }}
        />
      </motion.div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          type="current"
          label={t("stat_current")}
          value={current}
          unit={SENSOR_UNITS[activeSensor]}
          hint={currentHint}
          tone={
            activeSensor === "temp"
              ? currentStatus.tone
              : trend === "up"
                ? "warn"
                : trend === "down"
                  ? "good"
                  : "neutral"
          }
        />

        <StatCard
          type="min"
          label={t("stat_min")}
          value={min}
          unit={SENSOR_UNITS[activeSensor]}
          hint={t("for_period")}
          tone="neutral"
        />

        <StatCard
          type="max"
          label={t("stat_max")}
          value={max}
          unit={SENSOR_UNITS[activeSensor]}
          hint={t("for_period")}
          tone="neutral"
        />

        <StatCard
          type="avg"
          label={t("stat_avg")}
          value={avg}
          unit={SENSOR_UNITS[activeSensor]}
          hint={t(avgStatus.labelKey)}
          tone={avgStatus.tone}
        />
      </div>
    </div>
  );
}
