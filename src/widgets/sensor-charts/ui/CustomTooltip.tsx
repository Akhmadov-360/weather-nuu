import { SensorType } from "../../../entities/weather/model/weather.types";

function getUnit(sensor: SensorType) {
  switch (sensor) {
    case "temp":
      return "°C";
    case "hum":
      return "%";
    case "press":
      return "hPa";
    default:
      return "";
  }
}

type TooltipProps = {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  sensor: SensorType;
};

export function CustomTooltip({ active, payload, label, sensor }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const value = payload[0].value;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-white backdrop-blur-md shadow-lg">
      <div className="mb-1 text-white/60">{label}</div>
      <div className="text-sm font-medium">
        {value} {getUnit(sensor)}
      </div>
    </div>
  );
}
