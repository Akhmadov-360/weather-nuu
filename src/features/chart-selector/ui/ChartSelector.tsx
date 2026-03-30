import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { SENSOR_ORDER } from "@/entities/weather/model/weather.constants";
import type { SensorType } from "@/entities/weather/model/weather.types";
import { cn } from "@/shared/lib/cn";
import { Thermometer, Droplets, Wind, Flame, Activity } from "lucide-react";
import { SENSOR_COLORS } from "@/shared/lib/chart/chart-colors";

type ChartSelectorProps = {
  active: SensorType;
  onChange: (sensor: SensorType) => void;
};

const SENSOR_ICONS: Record<SensorType, React.ReactNode> = {
  temp: <Thermometer className="h-4 w-4" />,
  hum: <Droplets className="h-4 w-4" />,
  press: <Wind className="h-4 w-4" />,
  mq5: <Flame className="h-4 w-4" />,
  mq3: <Activity className="h-4 w-4" />,
};

export function ChartSelector({ active, onChange }: ChartSelectorProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="relative w-full overflow-x-auto">
      <div className="flex w-max items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-xl">
        {SENSOR_ORDER.map((sensor) => {
          const isActive = active === sensor;

          return (
            <button
              key={sensor}
              onClick={() => onChange(sensor)}
              className={cn(
                "relative flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:py-2 sm:text-sm",
                isActive ? "text-white" : "text-white/60 hover:text-white",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="chart-selector-active"
                  className="absolute inset-0 rounded-full"
                  style={{
                    backgroundColor: SENSOR_COLORS[sensor] + "22",
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                />
              )}

              <span
                className={cn("relative z-10", isActive ? "" : "opacity-80")}
                style={{
                  color: SENSOR_COLORS[sensor],
                }}
              >
                {SENSOR_ICONS[sensor]}
              </span>

              <span className="relative z-10 hidden sm:inline">{t(`btn_${sensor}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
