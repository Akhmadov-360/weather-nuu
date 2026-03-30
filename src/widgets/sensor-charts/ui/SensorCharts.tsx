import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { SensorType, WeatherHistoryItem } from "@/entities/weather/model/weather.types";
import { ChartSelector } from "@/features/chart-selector/ui/ChartSelector";
import { SENSOR_COLORS } from "@/shared/lib/chart/chart-colors";
import { formatChartDate } from "@/shared/lib/date/format-date";

type SensorChartsProps = {
  history: WeatherHistoryItem[];
};

type ChartPoint = WeatherHistoryItem & {
  shortDate: string;
};

const SENSOR_UNITS: Record<SensorType, string> = {
  temp: "°C",
  hum: "%",
  press: "hPa",
  mq5: "",
  mq3: "",
};

export function SensorCharts({ history }: SensorChartsProps): React.JSX.Element {
  const [activeSensor, setActiveSensor] = useState<SensorType>("temp");
  const { t } = useTranslation();

  const chartData = useMemo<ChartPoint[]>(
    () =>
      history.map((item) => ({
        ...item,
        shortDate: formatChartDate(item.date),
      })),
    [history],
  );

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
        formatter: (params: any) => {
          const point = Array.isArray(params) ? params[0] : params;
          const value = point?.value?.[1];
          const label = point?.axisValueLabel ?? "";
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
          data: chartData.map((item) => [item.shortDate, item[activeSensor]]),
        },
      ],
    };
  }, [activeSensor, chartData, t]);

  return (
    <div className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/5 p-3 backdrop-blur-xl sm:p-4 lg:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-medium text-white/80 sm:text-base">{t(`btn_${activeSensor}`)}</h3>

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
    </div>
  );
}
