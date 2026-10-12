import { STATION } from '@/shared/config/station';
import { sceneFor, type EventId, type Season } from './calendar';
import { effectiveTemperature, type Weather } from './weather';

export type LayerKind =
  | 'snow'
  | 'rain'
  | 'hail'
  | 'petals'
  | 'leaves'
  | 'motes'
  | 'fog'
  | 'frost'
  | 'shimmer'
  | 'stars'
  | 'rays'
  | 'clouds'
  | 'lightning';

export type LayerSpec = { kind: LayerKind; intensity: number; windX: number };

export type AtmosphereScene = {
  season: Season;
  event: EventId | null;
  layers: LayerSpec[];
  sky: { cloud: number; isDay: boolean };
  lights: boolean;
  confetti: boolean;
  greeting: EventId | null;
};

const SNOW_AT_OR_BELOW = 2;
const HEAT_AT_OR_ABOVE = 29;
const FROST_AT_OR_BELOW = -5;

const SEASONAL: Record<Season, { kind: LayerKind; intensity: number }> = {
  winter: { kind: 'snow', intensity: 0.25 },
  spring: { kind: 'petals', intensity: 0.35 },
  summer: { kind: 'motes', intensity: 0.3 },
  autumn: { kind: 'leaves', intensity: 0.35 },
};

const CONFETTI_EVENTS: readonly EventId[] = ['navruz', 'independence', 'new_year'];

/** The layers real weather asks for (the classroom never gets these). */
function weatherLayers(weather: Weather): { kind: LayerKind; intensity: number }[] {
  const { condition, intensity, cloud, isDay } = weather;
  const layers: { kind: LayerKind; intensity: number }[] = [];
  switch (condition) {
    case 'clear':
      layers.push({ kind: isDay ? 'rays' : 'stars', intensity: 0.6 });
      break;
    case 'clouds':
      break;
    case 'fog':
      layers.push({ kind: 'fog', intensity });
      break;
    case 'drizzle':
    case 'rain':
    case 'shower':
      layers.push({ kind: 'rain', intensity });
      break;
    case 'sleet':
      layers.push({ kind: 'rain', intensity: intensity * 0.6 }, { kind: 'snow', intensity: intensity * 0.6 });
      break;
    case 'snow':
    case 'blizzard':
      layers.push({ kind: 'snow', intensity });
      break;
    case 'hail':
      layers.push({ kind: 'hail', intensity });
      break;
    case 'thunder':
      layers.push({ kind: 'rain', intensity }, { kind: 'lightning', intensity });
      break;
  }
  if (cloud >= 0.3 || condition === 'clouds') layers.push({ kind: 'clouds', intensity: cloud });
  return layers;
}

/**
 * What the dashboard background should show: the season and holiday from the
 * calendar, plus, on the street page only, real weather. The classroom gets a
 * calm seasonal scene whatever the weather outside. A pure function: the
 * caller supplies the date, so the same input always gives the same scene.
 */
export function describeScene(input: {
  date: Date;
  source: 'room' | 'street';
  weather: Weather | null;
  streetTemp: number | null;
}): AtmosphereScene {
  const { date, source, weather } = input;
  const { season, event } = sceneFor(date, STATION.timeZone);
  const street = source === 'street';
  const live = street ? weather : null;
  const temp = street ? effectiveTemperature(input.streetTemp, weather) : null;

  const merged = new Map<LayerKind, number>();
  const add = (kind: LayerKind, intensity: number) => merged.set(kind, Math.max(merged.get(kind) ?? 0, intensity));

  const wetWeather = live ? weatherLayers(live) : [];
  const heavyWeather = wetWeather.some((l) => ['rain', 'snow', 'hail', 'fog', 'lightning'].includes(l.kind));
  if (!heavyWeather) {
    const seasonal = SEASONAL[season];
    add(seasonal.kind, seasonal.intensity);
  }
  for (const layer of wetWeather) add(layer.kind, layer.intensity);

  if (street && temp !== null) {
    if (temp <= SNOW_AT_OR_BELOW && !live) add('snow', 0.5);
    if (temp >= HEAT_AT_OR_ABOVE) add('shimmer', 0.5);
    if (temp <= FROST_AT_OR_BELOW) add('frost', 0.5);
  }

  if (event === 'new_year') add('snow', 0.7);
  if (event === 'navruz') add('petals', 0.5);
  if (event === 'teachers') add('leaves', 0.4);

  const windX = live?.windX ?? 0;
  const layers: LayerSpec[] = [...merged].map(([kind, intensity]) => ({ kind, intensity, windX }));

  return {
    season,
    event,
    layers,
    sky: { cloud: live?.cloud ?? 0, isDay: live?.isDay ?? true },
    lights: event === 'new_year',
    confetti: event !== null && CONFETTI_EVENTS.includes(event),
    greeting: event,
  };
}
