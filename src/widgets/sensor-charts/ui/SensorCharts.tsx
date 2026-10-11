import { useQuery } from "@tanstack/react-query";
import ReactEChartsCore from "echarts-for-react/lib/core";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { getSensorBounds } from "@/entities/weather/api/weather.api";
import { useWeatherHistoryCustomRangeQuery, useWeatherHistoryRangeQuery } from "@/entities/weather/api/weather.queries";
import { getSensorStatus, getTempDeltaFromNorm } from "@/entities/weather/model/weather-thresholds";
import type {
  AggregateBucketData,
  SensorType,
  WeatherHistoryItem,
} from "@/entities/weather/model/weather.types";
import { SENSORS_BY_SOURCE } from "@/entities/weather/model/weather.types";
import { ChartSelector } from "@/features/chart-selector/ui/ChartSelector";
import { DateRangePicker } from "@/features/date-range-picker/ui/DateRangePicker";
import { ExportMenu } from "@/features/export-data/ui/ExportMenu";
import { TimeRangeSelector } from "@/features/time-range-selector/ui/TimeRangeSelector";
import type { WeatherPageType } from "@/shared/types/common";
import {
  CLIENT_ONLY_RANGES,
  filterByExactRange,
  filterByTimeRange,
  type CustomDateRange,
  type TimeRange,
} from "@/shared/lib/date/filter-by-range";
import { CHART_GAP_THRESHOLD_MS, detectGaps, insertGapBreaks } from "@/shared/lib/date/insert-gap-breaks";
import { useTheme } from "@/shared/hooks/useTheme";
import { getChartTheme, getSensorColor } from "@/shared/lib/chart/chart-colors";
import { echarts } from "../lib/echarts-core";
import { buildChartOption, type ChartMode } from "../model/chart-option";
import { aggregateSeries, rawSeries, summarize } from "../model/chart-series";
import { ChartEmpty, ChartLoading } from "./ChartPlaceholder";
import { SensorStatCard } from "./SensorStatCard";

type SensorChartsProps = {
  type: WeatherPageType;
  /** Canonical live cache (≤24h, kept fresh by WS/polling) — source for the 1h/6h/24h ranges. */
  history: WeatherHistoryItem[];
  isRefetching?: boolean;
};

/** Dust units are translated (µg/m³ differs per language), so they are filled in by the component. */
const SENSOR_UNITS: Record<SensorType, string> = {
  temp:  "°C",
  hum:   "%",
  press: "hPa",
  mq5:   "ppm",
  mq3:   "ppm",
  pm25:  "",
  pm10:  "",
};

export function SensorCharts({ type, history, isRefetching = false }: SensorChartsProps): React.JSX.Element {
  const [selectedSensor, setActiveSensor] = useState<SensorType>("temp");
  const sensors = SENSORS_BY_SOURCE[type];
  // Navigating Room -> Street while a dust tab is open must fall back to a sensor Street actually has.
  const activeSensor: SensorType = sensors.includes(selectedSensor) ? selectedSensor : "temp";
  const [activeRange, setActiveRange] = useState<TimeRange>("24h");
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const units = useMemo<Record<SensorType, string>>(
    () => ({ ...SENSOR_UNITS, pm25: t("unit_ugm3"), pm10: t("unit_ugm3") }),
    [t],
  );

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
  const aggregatePoints = useMemo(
    () => (chartMode === "aggregate" && aggregateData ? aggregateSeries(aggregateData.items, activeSensor) : null),
    [chartMode, aggregateData, activeSensor],
  );

  // Raw-mode series — every reading, with detected offline gaps.
  const rawPoints = useMemo(
    () => (chartMode === "raw" ? rawSeries(rangedHistory, activeSensor) : []),
    [chartMode, rangedHistory, activeSensor],
  );

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

  const { min, max, avg, current, trend } = useMemo(() => summarize(values), [values]);

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

  const option = useMemo(
    () =>
      buildChartOption({
        sensor: activeSensor,
        source: type,
        unit: units[activeSensor],
        // Re-read when the theme flips: the colours (and the CSS variables ECharts resolves) change with it.
        color: getSensorColor(activeSensor),
        theme: getChartTheme(),
        chartMode,
        seriesData,
        gaps,
        aggregatePoints,
        t,
      }),
    // resolvedTheme is not read inside, but a theme flip must rebuild the option (new colours).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSensor, seriesData, gaps, chartMode, aggregatePoints, type, t, units, resolvedTheme],
  );


  return (
    <div
      className="relative flex h-full flex-col border p-3 sm:p-4 lg:p-5"
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
          className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-status-info/70"
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
        <ChartSelector sensors={sensors} active={activeSensor} onChange={setActiveSensor} />
      </div>

      {/* График. Empty/loading states share the same min-height as the chart
          itself so the surrounding card doesn't visibly collapse and jump
          back when the user switches to a range that has no data — the
          transition should feel like the chart is being replaced in-place,
          not like the whole panel is resizing. */}
      {isRangeLoading ? (
        <ChartLoading />
      ) : seriesData.length === 0 ? (
        <ChartEmpty
          onWiden={
            customRange || activeRange !== "90d"
              ? () => {
                  setCustomRange(null);
                  setActiveRange("90d");
                }
              : undefined
          }
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          // Адаптивная высота: мобайл → планшет → десктоп
          className="min-h-[220px] w-full flex-1 sm:min-h-[300px] lg:min-h-[360px]"
        >
          <ReactEChartsCore
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
            echarts={echarts}
            option={option}
            notMerge={false}
            lazyUpdate
            style={{ height: "100%", width: "100%", minHeight: "inherit" }}
            opts={{ renderer: "canvas" }}
          />
        </motion.div>
      )}

      {/* Stat-карточки */}
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-(--glass-border) bg-(--glass-border) lg:grid-cols-4">
        <SensorStatCard
          type="current"
          label={t("stat_current")}
          value={current}
          unit={units[activeSensor]}
          hint={currentHint}
          tone={
            activeSensor === "temp"
              ? currentStatus.tone
              : trend === "up" ? "warn" : trend === "down" ? "good" : "neutral"
          }
        />
        <SensorStatCard type="min" label={t("stat_min")} value={min} unit={units[activeSensor]} hint={t("for_period")} tone="neutral" />
        <SensorStatCard type="max" label={t("stat_max")} value={max} unit={units[activeSensor]} hint={t("for_period")} tone="neutral" />
        <SensorStatCard type="avg" label={t("stat_avg")} value={avg} unit={units[activeSensor]} hint={t(avgStatus.labelKey)} tone={avgStatus.tone} />
      </div>
    </div>
  );
}