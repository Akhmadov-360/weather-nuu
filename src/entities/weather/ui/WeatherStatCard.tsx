import type { SensorType } from "@/entities/weather/model/weather.types";
import { SENSOR_COLORS } from "@/shared/lib/chart/chart-colors";
import { motion } from "framer-motion";
import { Activity, Droplets, Flame, Thermometer, Wind } from "lucide-react";

type WeatherStatCardProps = {
  label: string;
  value: number | null | undefined;
  unit?: string;
  sensor: SensorType;
};

const SENSOR_ICONS: Record<SensorType, React.ReactNode> = {
  temp: <Thermometer className="h-4 w-4" />,
  hum: <Droplets className="h-4 w-4" />,
  press: <Wind className="h-4 w-4" />,
  mq5: <Flame className="h-4 w-4" />,
  mq3: <Activity className="h-4 w-4" />,
};

export function WeatherStatCard({ label, value, unit, sensor }: WeatherStatCardProps): React.JSX.Element {
  const color = SENSOR_COLORS[sensor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition-all hover:bg-white/10"
    >
      <div
        className="absolute inset-x-0 top-0 h-px opacity-60"
        style={{
          background: `linear-gradient(to right, transparent, ${color}, transparent)`,
        }}
      />

      <div className="flex items-start justify-between">
        <span className="text-[11px] uppercase tracking-[0.22em] text-slate-300/70">{label}</span>

        <span
          className="rounded-lg p-1.5"
          style={{
            backgroundColor: color + "22",
            color,
          }}
        >
          {SENSOR_ICONS[sensor]}
        </span>
      </div>

      <div className="mt-3 flex items-end gap-1">
        <span className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{formatValue(value)}</span>

        {unit && <span className="pb-[2px] text-xs text-slate-300/70 sm:text-sm">{unit}</span>}
      </div>
    </motion.div>
  );
}

function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
