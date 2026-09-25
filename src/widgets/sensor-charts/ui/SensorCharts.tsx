import { useQuery } from "@tanstack/react-query";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { getSensorBounds } from "@/entities/weather/api/weather.api";
import { useWeatherHistoryCustomRangeQuery, useWeatherHistoryRangeQuery } from "@/entities/weather/api/weather.queries";
import { getSensorStatus, getTempDeltaFromNorm } from "@/entities/weather/model/weather-thresholds";
import type {
  AggregateBucketData,
  AggregateBucketRow,
  SensorType,
  WeatherHistoryItem,
} from "@/entities/weather/model/weather.types";
import { ChartSelector } from "@/features/chart-selector/ui/ChartSelector";
import { DateRangePicker } from "@/features/date-range-picker/ui/DateRangePicker";
import { ExportMenu } from "@/features/export-data/ui/ExportMenu";
import { TimeRangeSelector } from "@/features/time-range-selector/ui/TimeRangeSelector";
import type { WeatherPageType } from "@/shared/types/common";
import { SENSOR_COLORS } from "@/shared/lib/chart/chart-colors";
import {
  CLIENT_ONLY_RANGES,
  filterByExactRange,
  filterByTimeRange,
  isValidTimestamp,
  type CustomDateRange,
  type TimeRange,
} from "@/shared/lib/date/filter-by-range";
import { CHART_GAP_THRESHOLD_MS, detectGaps, insertGapBreaks } from "@/shared/lib/date/insert-gap-breaks";
import { SENSOR_RANGES } from "@/shared/lib/weather-ranges";
import { SensorStatCard } from "./SensorStatCard";

type SensorChartsProps = {
  type: WeatherPageType;
  /** Canonical live cache (≤24h, kept fresh by WS/polling) — source for the 1h/6h/24h ranges. */
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

export function SensorCharts({ type, history, isRefetching = false }: SensorChartsProps): React.JSX.Element {
  const [activeSensor, setActiveSensor] = useState<SensorType>("temp");
  const [activeRange, setActiveRange] = useState<TimeRange>("24h");
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const { t } = useTranslation();

  // The sensor's actual earliest recorded reading — used to disable
  // calendar dates before the sensor ever existed. Cached for 24h since
  // "earliest" only ever moves as far as the retention policy shifts it
  // (i.e. very rarely relative to a user session).
  const boundsQuery = useQuery({
    queryKey: ["weather", type, "bounds"],
    queryFn: () => getSensorBounds(type),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const earliestSensorDate = boundsQuery.data?.earliest ?? undefined;

  // Календарь — если задан, имеет приоритет над чипами 1ч/6ч/.../90д.
  // The hook picks its transport (raw vs aggregate) by span internally.
  const customRangeQuery = useWeatherHistoryCustomRangeQuery(type, customRange);
  const customQueryActive = customRange
    ? customRangeQuery.mode === "aggregate"
      ? customRangeQuery.aggregateQuery
      : customRangeQuery.rawQuery
    : null;

  // 1ч/6ч/24ч — фильтруем на клиенте живой ≤24h кэш, без лишнего запроса.
  // 7д/30д/90д — сервер отдаёт бакетированный aggregate за одну запрос.
  const isClientRange = CLIENT_ONLY_RANGES.has(activeRange);
  const rangeQuery = useWeatherHistoryRangeQuery(type, activeRange);
  const isRangeLoading = customRange
    ? (customQueryActive?.isLoading ?? false)
    : !isClientRange && rangeQuery.isLoading;

  /**
   * The chart runs in one of two modes:
   * - "raw":       every point is a real reading, drawn as-is, with
   *                offline-gap detection breaking the line at outages.
   * - "aggregate": each point is one bucket (avg/min/max/count) — drawn
   *                as a line for avg plus a shaded min–max band, so
   *                short outliers stay visible even after downsampling.
   */
  type ChartMode = "raw" | "aggregate";
  const chartMode: ChartMode = useMemo(() => {
    if (customRange) return customRangeQuery.mode;
    return isClientRange ? "raw" : "aggregate";
  }, [customRange, customRangeQuery.mode, isClientRange]);

  // Aggregate-mode raw response (may be null when in raw mode or loading).
  const aggregateData: AggregateBucketData | null = useMemo(() => {
    if (chartMode !== "aggregate") return null;
    if (customRange) return customRangeQuery.aggregateQuery.data ?? null;
    return (rangeQuery.data as AggregateBucketData | null | undefined) ?? null;
  }, [chartMode, customRange, customRangeQuery.aggregateQuery.data, rangeQuery.data]);

  // Raw-mode history rows, either from the live cache (client-only ranges)
  // or from a raw custom-range fetch.
  const rangedHistory: WeatherHistoryItem[] = useMemo(() => {
    if (chartMode !== "raw") return [];
    if (customRange) return filterByExactRange(customRangeQuery.rawQuery.data ?? [], customRange);
    return filterByTimeRange(history, activeRange);
  }, [chartMode, customRange, customRangeQuery.rawQuery.data, history, activeRange]);

  // Aggregate-mode series — avg line + optional (min,max) band, indexed by activeSensor.
  const aggregatePoints = useMemo(() => {
    if (chartMode !== "aggregate" || !aggregateData) return null;
    const rows = aggregateData.items.filter((r: AggregateBucketRow) => r.count > 0);
    const avg: [number, number | null][] = [];
    const min: [number, number | null][] = [];
    const range: [number, number | null][] = []; // (max - min), stacked on min to draw the band
    for (const r of rows) {
      const ts = new Date(r.ts).getTime();
      const stats = r[activeSensor];
      avg.push([ts, stats.avg]);
      min.push([ts, stats.min]);
      range.push([ts, stats.min != null && stats.max != null ? stats.max - stats.min : null]);
    }
    return { rows, avg, min, range };
  }, [chartMode, aggregateData, activeSensor]);

  // Raw-mode series — every reading, with detected offline gaps.
  const rawPoints = useMemo(() => {
    if (chartMode !== "raw") return [];
    return rangedHistory
      .filter((item) => isValidTimestamp(item.date))
      .map((item) => [
        new Date(item.date).getTime(),
        item[activeSensor] ?? null,
      ] as [number, number | null]);
  }, [chartMode, rangedHistory, activeSensor]);

  const gaps = useMemo(
    () => (chartMode === "raw" ? detectGaps(rawPoints, CHART_GAP_THRESHOLD_MS) : []),
    [chartMode, rawPoints],
  );

  // What ECharts actually plots — for raw, the reading points with null
  // breaks at gaps; for aggregate, the avg line. Both share the same
  // [ts, value|null] shape so downstream math (stats, tooltip, endLabel)
  // stays uniform.
  const seriesData: [number, number | null][] = useMemo(
    () => (chartMode === "aggregate" ? aggregatePoints?.avg ?? [] : insertGapBreaks(rawPoints, gaps)),
    [chartMode, aggregatePoints, rawPoints, gaps],
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
        // +20 под toolbox-иконки (reset zoom / save as image) в правом верхнем углу
        top: 36,
        bottom: 50,
        containLabel: true,
      },

      toolbox: {
        right: 8,
        top: 0,
        itemSize: 14,
        itemGap: 10,
        iconStyle: {
          borderColor: "var(--chart-axis-label)",
          opacity: 0.55,
        },
        emphasis: {
          iconStyle: { borderColor: color, opacity: 1 },
        },
        feature: {
          // Возвращает dataZoom к 0–100% после ручного зума/панорамирования —
          // без этого единственный способ вернуться к полному виду — заново
          // выбрать тот же диапазон в TimeRangeSelector.
          restore: { title: t("chart_reset_zoom") },
          saveAsImage: {
            title: t("chart_save_image"),
            name: `${type}-${activeSensor}-${new Date().toISOString().slice(0, 10)}`,
            // No explicit backgroundColor — canvas fillStyle can't resolve
            // CSS custom properties (var(--x) is a cascade-time construct,
            // not something the 2D context understands), so a literal
            // theme token here would silently no-op. Leaving it unset
            // exports a transparent PNG instead, which is the standard,
            // theme-safe default for canvas chart exports.
            pixelRatio: 2,
          },
        },
      },

      tooltip: {
        trigger: "axis",
        triggerOn: "mousemove|click|mousewheel",
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
          const first = arr[0] as { value?: [number, number | null] } | undefined;
          if (!first?.value) return "";
          const [ts, val] = first.value;
          const fmt = (n: number | null | undefined) =>
            typeof n === "number"
              ? Number.isInteger(n) ? String(n) : n.toFixed(2)
              : "—";

          // Aggregate-mode tooltip: pull the corresponding bucket by ts so
          // we can also show min/max/count — those are what distinguish a
          // calm hourly avg from one that spiked hard and mean-reverted.
          if (chartMode === "aggregate" && aggregatePoints) {
            const bucket = aggregatePoints.rows.find((r) => new Date(r.ts).getTime() === ts);
            const stats = bucket?.[activeSensor];
            const rows: [string, string][] = [];
            if (stats) {
              rows.push([t("stat_avg"), `${fmt(stats.avg)} ${unit}`]);
              rows.push([t("stat_min"), `${fmt(stats.min)} ${unit}`]);
              rows.push([t("stat_max"), `${fmt(stats.max)} ${unit}`]);
            }
            if (bucket) rows.push([t("stat_count"), String(bucket.count)]);
            return `
              <div style="min-width:180px;">
                <div style="margin-bottom:6px;font-size:11px;color:var(--chart-tooltip-label)">
                  ${formatTooltipTs(ts)}
                </div>
                ${rows.map(([k, v]) => `
                  <div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--chart-tooltip-text);line-height:1.7">
                    <span style="opacity:0.7">${k}</span>
                    <span style="font-weight:600">${v}</span>
                  </div>`).join("")}
              </div>`;
          }

          return `
            <div style="min-width:140px;">
              <div style="margin-bottom:6px;font-size:11px;color:var(--chart-tooltip-label)">
                ${formatTooltipTs(ts)}
              </div>
              <div style="font-size:18px;font-weight:700;color:var(--chart-tooltip-text);line-height:1.2">
                ${fmt(val)}
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
        // In aggregate mode the min–max band is drawn first, underneath
        // the avg line, so short-lived outliers stay visible: a bucket
        // whose avg looks calm but whose max spiked hard shows up as a
        // sudden widening of the band. Two stacked "invisible" lines are
        // the standard ECharts pattern for a shaded confidence band — the
        // first line sits at min with no stroke, the second's stacked
        // value is (max - min) so its area style ends up filling the
        // vertical gap between the two.
        ...(chartMode === "aggregate" && aggregatePoints
          ? [
              {
                name: "__min",
                type: "line" as const,
                data: aggregatePoints.min,
                stack: "band",
                lineStyle: { opacity: 0 },
                symbol: "none",
                tooltip: { show: false },
                silent: true,
                z: 0,
              },
              {
                name: "__range",
                type: "line" as const,
                data: aggregatePoints.range,
                stack: "band",
                lineStyle: { opacity: 0 },
                symbol: "none",
                areaStyle: { color, opacity: 0.18 },
                tooltip: { show: false },
                silent: true,
                z: 0,
              },
            ]
          : []),
        {
          name: t(`btn_${activeSensor}`),
          type: "line",
          // Safety net when a caller ends up throwing tens of thousands of
          // raw points at ECharts — LTTB (Largest-Triangle-Three-Buckets)
          // downsamples to what actually fits the viewport while preserving
          // the shape of the line, so spikes don't get flattened by a naïve
          // stride-based sampler. Kicks in only when there's enough data
          // to warrant it; below that ECharts renders untouched.
          // Disabled in aggregate mode — every bucket is already visually
          // meaningful, an extra downsample would lose the point of it.
          sampling: chartMode === "raw" ? "lttb" : undefined,
          progressive: 5_000,
          progressiveThreshold: 20_000,
          smooth: 0.4,
          showSymbol: false,
          z: 1,
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
              // Same precision as the tooltip (.toFixed(2)) — at 1 decimal,
              // consecutive close readings (30.18 → 30.24) both round to
              // "30.2" and the label looks frozen even though the value is
              // actually ticking underneath.
              return `${Number.isInteger(v) ? String(v) : v.toFixed(2)} ${unit}`;
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
          // Shades the same offline stretches the line already breaks at —
          // makes "sensor was down here" readable at a glance instead of
          // only visible as an absence of line.
          markArea: gaps.length
            ? {
                silent: true,
                itemStyle: { color: "var(--glass-surface-hover)", opacity: 0.6 },
                label: { show: false },
                data: gaps.map((gap) => [{ xAxis: gap.fromTs }, { xAxis: gap.toTs }]),
              }
            : undefined,
        },
      ],
    };
  }, [activeSensor, seriesData, gaps, chartMode, aggregatePoints, type, t]);

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

      {/* Header — заголовок + селекторы датчика и диапазона */}
      <div className="mb-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1 shrink-0 rounded-full bg-status-info" />
            <h3 className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-themed sm:text-xs">
              {t("chart_history_title")}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TimeRangeSelector
              value={customRange ? null : activeRange}
              onChange={(range) => {
                setCustomRange(null);
                setActiveRange(range);
              }}
            />
            <DateRangePicker
              value={customRange}
              onChange={setCustomRange}
              fromDate={earliestSensorDate}
              toDate={new Date()}
              open={datePickerOpen}
              onOpenChange={setDatePickerOpen}
            />
            <ExportMenu
              type={type}
              selectedRange={customRange}
              earliestSensorDate={earliestSensorDate ?? null}
              onRequestPickRange={() => setDatePickerOpen(true)}
            />
          </div>
        </div>
        <ChartSelector active={activeSensor} onChange={setActiveSensor} />
      </div>

      {/* График. Empty/loading states share the same min-height as the chart
          itself so the surrounding card doesn't visibly collapse and jump
          back when the user switches to a range that has no data — the
          transition should feel like the chart is being replaced in-place,
          not like the whole panel is resizing. */}
      {isRangeLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex min-h-[220px] w-full flex-1 items-center justify-center text-sm text-muted-themed sm:min-h-[300px] lg:min-h-[360px]"
        >
          {t("chart_loading")}
        </motion.div>
      ) : seriesData.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex min-h-[220px] w-full flex-1 items-center justify-center text-sm text-muted-themed sm:min-h-[300px] lg:min-h-[360px]"
        >
          {t("no_data_for_range")}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          // Адаптивная высота: мобайл → планшет → десктоп
          className="min-h-[220px] w-full flex-1 sm:min-h-[300px] lg:min-h-[360px]"
        >
          <ReactECharts
            // Remount (full re-render, not merge) whenever the sensor OR
            // the selected time window changes — otherwise ECharts keeps
            // the old dataZoom window/axis extent from merge-mode updates
            // (e.g. switch 90д → 24ч and the x-axis stays stretched to
            // the old 90-day span until the user manually re-zooms).
            // WS/polling ticks for the SAME range don't change this key,
            // so live updates still merge smoothly without a zoom reset.
            key={`${activeSensor}:${
              customRange
                ? `custom:${customRange.from.toISOString()}_${customRange.to.toISOString()}`
                : activeRange
            }`}
            option={option}
            notMerge={false}
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
