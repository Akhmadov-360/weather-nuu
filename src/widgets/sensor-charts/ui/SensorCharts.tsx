import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { getSensorStatus, getTempDeltaFromNorm } from "@/entities/weather/model/weather-thresholds";
import type { SensorType, WeatherHistoryItem } from "@/entities/weather/model/weather.types";
import { ChartSelector } from "@/features/chart-selector/ui/ChartSelector";
import { SENSOR_COLORS } from "@/shared/lib/chart/chart-colors";
import { isValidTimestamp } from "@/shared/lib/date/filter-by-range";
import { SENSOR_RANGES } from "@/shared/lib/weather-ranges";
import { SensorStatCard } from "./SensorStatCard";

type SensorChartsProps = {
  history: WeatherHistoryItem[];
  isRefetching?: boolean;
};

const SENSOR_UNITS: Record<SensorType, string> = {
  temp:  "°C",
  hum:   "%",
  press: "hPa",
  mq5:   "ppm",
  mq3:   "мкг/м³",
};

function buildThresholdLines(sensor: SensorType) {
  const range = SENSOR_RANGES[sensor];
  return range.zones.slice(0, -1).map((zone) => ({
    yAxis: zone.to,
    lineStyle: { type: "dashed" as const, width: 1, opacity: 0.35 },
    label: {
      show: true,
      formatter: String(zone.to),
      fontSize: 10,
      color: "var(--chart-axis-label)",
      position: "end" as const,
    },
  }));
}

/*
 * Адаптивный formatter оси X.
 * Ключевое: проверяем не только длительность диапазона (spanMs),
 * но и пересечение календарных дней — данные могут быть < 24ч
 * но охватывать два дня (напр. 9 мая 17:00 → 10 мая 10:00).
 * В этом случае метки без даты ("17:00", "10:00") непонятны.
 */
function makeAxisFormatter(firstTs: number, lastTs: number) {
  const DAY = 86_400_000;
  const spanMs = lastTs - firstTs;

  const firstDate = new Date(firstTs);
  const lastDate  = new Date(lastTs);
  const crossesDay =
    firstDate.getDate()  !== lastDate.getDate()  ||
    firstDate.getMonth() !== lastDate.getMonth() ||
    firstDate.getFullYear() !== lastDate.getFullYear();

  return (val: number) => {
    const d  = new Date(val);
    const hh = d.getHours().toString().padStart(2, "0");
    const mn = d.getMinutes().toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    const mo = (d.getMonth() + 1).toString().padStart(2, "0");

    if (spanMs > DAY * 7)       return `${dd}.${mo}`;           // > 7 дней → только дата
    if (spanMs > DAY || crossesDay) return `${dd}.${mo}\n${hh}:${mn}`; // > 1 дня или разные дни → дата + время
    return `${hh}:${mn}`;                                       // внутри одного дня → только время
  };
}

function formatTooltipTs(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(ts));
}

export function SensorCharts({ history, isRefetching = false }: SensorChartsProps): React.JSX.Element {
  const [activeSensor, setActiveSensor] = useState<SensorType>("temp");
  const { t } = useTranslation();

  // Все валидные точки — соединяем непрерывно.
  // Разрывы во времени видны через адаптивные метки оси (дд.мм\nЧЧ:мм)
  // и через полную дату в tooltip.
  const seriesData = useMemo(
    () =>
      history
        .filter((item) => isValidTimestamp(item.date))
        .map((item) => [
          new Date(item.date).getTime(),
          item[activeSensor] ?? null,
        ] as [number, number | null]),
    [history, activeSensor],
  );

  const values = useMemo(
    () => seriesData.map(([, v]) => v).filter((v): v is number => typeof v === "number"),
    [seriesData],
  );

  const current = values.at(-1) ?? null;
  const prev    = values.at(-2) ?? null;

  const trend =
    current != null && prev != null
      ? current > prev ? "up" : current < prev ? "down" : "stable"
      : "stable";

  const { min, max, avg } = useMemo(() => {
    if (!values.length) return { min: null, max: null, avg: null };
    let lo = values[0], hi = values[0], sum = 0;
    for (const v of values) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
      sum += v;
    }
    return { min: lo, max: hi, avg: sum / values.length };
  }, [values]);

  const avgStatus     = getSensorStatus(activeSensor, avg);
  const currentStatus = getSensorStatus(activeSensor, current);
  const tempDelta     = activeSensor === "temp" ? getTempDeltaFromNorm(current) : null;

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

  const option = useMemo((): EChartsOption => {
    const color      = SENSOR_COLORS[activeSensor];
    const unit       = SENSOR_UNITS[activeSensor];
    const thresholds = buildThresholdLines(activeSensor);

    const firstTs = seriesData.at(0)?.[0]  ?? 0;
    const lastTs  = seriesData.at(-1)?.[0] ?? 0;
    const axisFormatter = makeAxisFormatter(firstTs, lastTs);

    return {
      animationDuration: 300,
      animationEasing: "cubicOut",
      grid: {
        left: 8,
        // Правый отступ для endLabel — на мобильных чуть меньше
        right: 56,
        top: 16,
        bottom: 50,
        containLabel: true,
      },

      tooltip: {
        trigger: "axis",
        triggerOn: "mousemove|click",
        axisPointer: {
          type: "cross",
          snap: true,
          animation: false,
          lineStyle:  { opacity: 0.25, width: 1 },
          crossStyle: { opacity: 0.20, width: 1 },
        },
        backgroundColor: "var(--chart-tooltip-bg)",
        borderColor:     "var(--chart-tooltip-border)",
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: "border-radius: 12px; backdrop-filter: blur(12px);",
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const p   = arr[0] as { value?: [number, number | null] } | undefined;
          if (!p?.value) return "";
          const [ts, val] = p.value;
          const formatted =
            typeof val === "number"
              ? Number.isInteger(val) ? String(val) : val.toFixed(2)
              : "—";
          return `
            <div style="min-width:140px;">
              <div style="margin-bottom:6px;font-size:11px;color:var(--chart-tooltip-label)">
                ${formatTooltipTs(ts)}
              </div>
              <div style="font-size:18px;font-weight:700;color:var(--chart-tooltip-text);line-height:1.2">
                ${formatted}
                <span style="font-size:12px;font-weight:400;opacity:0.7;margin-left:2px">${unit}</span>
              </div>
            </div>`;
        },
      },

      xAxis: {
        type: "time",
        axisLine:  { lineStyle: { color: "var(--chart-axis-line)" } },
        axisTick:  { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: "var(--chart-axis-label)",
          fontSize: 11,
          margin: 10,
          hideOverlap: true,
          lineHeight: 16,
          formatter: axisFormatter,
        },
      },

      yAxis: {
        type: "value",
        scale: true,
        splitLine: { lineStyle: { color: "var(--chart-grid-line)" } },
        axisLine:  { show: false },
        axisTick:  { show: false },
        axisLabel: { color: "var(--chart-axis-label)", fontSize: 11 },
      },

      dataZoom: [
        // Пинч / скролл колёсиком — работает на тач и десктоп
        { type: "inside", throttle: 40 },
        // Слайдер — только на не-мобильных (достаточно места)
        {
          type: "slider",
          height: 18,
          bottom: 4,
          borderColor: "transparent",
          backgroundColor: "var(--glass-surface-soft)",
          fillerColor: `${color}28`,
          handleSize: 0,
          moveHandleSize: 0,
          labelFormatter: (_: number, valStr: string) => {
            const ts = new Date(valStr).getTime();
            return Number.isNaN(ts) ? "" : formatTooltipTs(ts);
          },
          textStyle: { color: "var(--chart-axis-label)", fontSize: 10 },
        },
      ],

      series: [
        {
          name: t(`btn_${activeSensor}`),
          type: "line",
          smooth: 0.4,
          showSymbol: false,
          lineStyle: {
            width: 2.5,
            color,
            shadowBlur: 8,
            shadowColor: `${color}50`,
            shadowOffsetY: 2,
          },
          itemStyle: {
            color,
            borderColor: "var(--glass-surface)",
            borderWidth: 2,
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${color}44` },
                { offset: 1, color: `${color}04` },
              ],
            },
          },
          emphasis: { focus: "series" },
          // Плашка с текущим значением в конце линии
          endLabel: {
            show: true,
            valueAnimation: false,
            formatter: (params: unknown) => {
              const p = params as { value?: [number, number | null] };
              const v = p?.value?.[1];
              if (typeof v !== "number") return "";
              return `${Number.isInteger(v) ? String(v) : v.toFixed(1)} ${unit}`;
            },
            color,
            fontWeight: "bold",
            fontSize: 12,
            padding: [3, 8],
            backgroundColor: `${color}18`,
            borderRadius: 8,
            borderColor: `${color}55`,
            borderWidth: 1,
          },
          data: seriesData,
          markLine: thresholds.length
            ? { silent: true, symbol: ["none", "none"], data: thresholds }
            : undefined,
        },
      ],
    };
  }, [activeSensor, seriesData, t]);

  return (
    <div
      className="relative flex h-full flex-col border p-3 backdrop-blur-xl sm:p-4 lg:p-5"
      style={{
        borderRadius: "24px",
        backgroundColor: "var(--glass-surface)",
        borderColor: "var(--glass-border)",
        boxShadow: "var(--panel-shadow)",
      }}
    >
      {/* Refetch indicator */}
      {isRefetching && (
        <motion.div
          className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-blue-500/70"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Header — заголовок + селектор датчика */}
      <div className="mb-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 shrink-0 rounded-full bg-blue-500" />
          <h3 className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-themed sm:text-xs">
            {t("chart_history_title")}
          </h3>
        </div>
        <ChartSelector active={activeSensor} onChange={setActiveSensor} />
      </div>

      {/* График */}
      {seriesData.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-themed">
          {t("empty_title")}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          // Адаптивная высота: мобайл → планшет → десктоп
          className="min-h-[220px] w-full flex-1 sm:min-h-[300px] lg:min-h-[360px]"
        >
          <ReactECharts
            // key только по сенсору — смена датчика сбрасывает zoom,
            // polling-апдейты zoom не сбрасывают (merge mode)
            key={activeSensor}
            option={option}
            lazyUpdate
            style={{ height: "100%", width: "100%", minHeight: "inherit" }}
            opts={{ renderer: "canvas" }}
          />
        </motion.div>
      )}

      {/* Stat-карточки */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SensorStatCard
          type="current"
          label={t("stat_current")}
          value={current}
          unit={SENSOR_UNITS[activeSensor]}
          hint={currentHint}
          tone={
            activeSensor === "temp"
              ? currentStatus.tone
              : trend === "up" ? "warn" : trend === "down" ? "good" : "neutral"
          }
        />
        <SensorStatCard type="min" label={t("stat_min")} value={min} unit={SENSOR_UNITS[activeSensor]} hint={t("for_period")} tone="neutral" />
        <SensorStatCard type="max" label={t("stat_max")} value={max} unit={SENSOR_UNITS[activeSensor]} hint={t("for_period")} tone="neutral" />
        <SensorStatCard type="avg" label={t("stat_avg")} value={avg} unit={SENSOR_UNITS[activeSensor]} hint={t(avgStatus.labelKey)} tone={avgStatus.tone} />
      </div>
    </div>
  );
}
