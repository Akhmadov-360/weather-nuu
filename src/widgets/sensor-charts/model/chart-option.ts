import type { EChartsOption } from 'echarts';
import type { TFunction } from 'i18next';

import type { SensorType } from '@/entities/weather/model/weather.types';
import { SENSOR_COLORS } from '@/shared/lib/chart/chart-colors';
import type { ChartGap } from '@/shared/lib/date/insert-gap-breaks';
import type { WeatherPageType } from '@/shared/types/common';
import {
  formatTooltipTs,
  makeAxisFormatter,
  thresholdValues,
  type Point,
  type aggregateSeries,
} from './chart-series';

export type ChartMode = 'raw' | 'aggregate';

export type ChartOptionInput = {
  sensor: SensorType;
  source: WeatherPageType;
  unit: string;
  chartMode: ChartMode;
  seriesData: Point[];
  gaps: ChartGap[];
  aggregatePoints: ReturnType<typeof aggregateSeries> | null;
  t: TFunction;
};

function buildThresholdLines(sensor: SensorType) {
  return thresholdValues(sensor).map((value) => ({
    yAxis: value,
    lineStyle: { type: 'dashed' as const, width: 1, opacity: 0.35 },
    label: {
      show: true,
      formatter: String(value),
      fontSize: 10,
      color: 'var(--chart-axis-label)',
      position: 'end' as const,
    },
  }));
}

/** Everything ECharts needs for one sensor chart; pure, so it can be reasoned about without React. */
export function buildChartOption({
  sensor: activeSensor,
  source: type,
  unit,
  chartMode,
  seriesData,
  gaps,
  aggregatePoints,
  t,
}: ChartOptionInput): EChartsOption {
  const color      = SENSOR_COLORS[activeSensor];
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
}
