import type { EngineLayer } from '../engine/engine';

/**
 * Which falling layers the packages draw (falling-leaves for leaves and petals, react-snowfall for snow,
 * react-rainfall for rain) and how many pieces and how much wind each gets. Everything else in the scene
 * (sky, clouds, fog, lightning, hail, fireflies, lights) stays with our engine. Pure: no React, no DOM.
 */

export type LeafPlan = { count: number; wind: [number, number] };
export type SnowPlan = { count: number; wind: [number, number] };
export type RainPlan = { count: number; intensity: number; angle: number };

export type PackagePlan = {
  leaves?: LeafPlan;
  petals?: LeafPlan;
  snow?: SnowPlan;
  rain?: RainPlan;
  /** The layers that remain for our engine. */
  rest: EngineLayer[];
};

const REPLACED = new Set(['leaves', 'petals', 'snow', 'rain']);

/** Pieces per unit of (intensity x budget), tuned so a desktop scene looks like the engine's own density. */
const PER_UNIT = { leaves: 0.75, petals: 0.75, snow: 3.3, rain: 2.5 };

function count(intensity: number, budget: number, perUnit: number): number {
  return Math.max(1, Math.round(intensity * budget * perUnit));
}

function ordered(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

export function packagePlan(layers: EngineLayer[], budget: number): PackagePlan {
  const rest = layers.filter((l) => !REPLACED.has(l.kind));
  if (budget <= 0) return { rest: layers };

  const find = (kind: string) => layers.find((l) => l.kind === kind);
  const plan: PackagePlan = { rest };

  const leaves = find('leaves');
  if (leaves) plan.leaves = { count: count(leaves.intensity, budget, PER_UNIT.leaves), wind: ordered(leaves.windX / 60, leaves.windX / 25 + 0.5) };

  const petals = find('petals');
  if (petals) plan.petals = { count: count(petals.intensity, budget, PER_UNIT.petals), wind: ordered(petals.windX / 60, petals.windX / 25 + 0.4) };

  const snow = find('snow');
  if (snow) plan.snow = { count: count(snow.intensity, budget, PER_UNIT.snow), wind: ordered(snow.windX / 60 - 0.4, snow.windX / 25 + 0.6) };

  const rain = find('rain');
  if (rain) {
    plan.rain = {
      count: count(rain.intensity, budget, PER_UNIT.rain),
      intensity: Math.min(1, rain.intensity + 0.2),
      angle: Math.max(-20, Math.min(20, rain.windX / 3)),
    };
  }
  return plan;
}
