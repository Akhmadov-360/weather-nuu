import { LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
  ToolboxComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { LegacyGridContainLabel } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

/**
 * Only the ECharts parts the sensor chart draws, instead of the whole library
 * (the full bundle is about twice the size). If a new chart type or component
 * is added to chart-option.ts, register it here or it silently will not render.
 * LegacyGridContainLabel keeps the `grid.containLabel` option working in v6.
 */
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
  MarkAreaComponent,
  LegacyGridContainLabel,
  CanvasRenderer,
]);

export { echarts };
