/**
 * How a leaf, a petal or a flake moves on its way down. Every piece gets its own sway frequency and
 * amplitude (so they never swing in step), a spin of its own, a tilt that follows its sideways motion
 * (it leans into the direction it travels, like a leaf rocking on the air) and a tumble that turns it
 * edge-on and flat again, falling a little faster edge-on. Pure functions: no canvas, no state.
 */

const TAU = Math.PI * 2;

export type FlutterKind = 'leaves' | 'petals' | 'snow';

export type Flutter = {
  /** Sway frequency, rad/s. */
  swayF: number;
  /** Sway amplitude factor around 1. */
  swayA: number;
  /** Slow spin, rad/s (negative turns the other way). */
  spin: number;
  /** Phase of the tumble; advanced by the engine at `flipF`. */
  flipPh: number;
  /** Tumble frequency, rad/s. */
  flipF: number;
  /** Largest tilt in radians. */
  rock: number;
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function makeFlutter(kind: FlutterKind, rnd: () => number): Flutter {
  const swayF = lerp(0.7, 1.9, rnd());
  const swayA = lerp(0.7, 1.3, rnd());
  // A flake only drifts: it does not spin, rock or tumble.
  if (kind === 'snow') return { swayF, swayA, spin: 0, flipPh: 0, flipF: 0, rock: 0 };

  const spinMax = kind === 'leaves' ? 0.9 : 0.6;
  return {
    swayF,
    swayA,
    spin: lerp(-spinMax, spinMax, rnd()),
    flipPh: rnd() * TAU,
    flipF: lerp(1.2, 2.6, rnd()),
    rock: lerp(0.25, 0.55, rnd()),
  };
}

/** Sideways speed from sway in px/s; it averages to zero over a period, so nothing drifts away on its own. */
export function swayVelocity(phase: number, f: Flutter, amplitude: number): number {
  return Math.sin(phase * f.swayF) * amplitude * f.swayA;
}

/** Tilt in radians: positive while moving right, negative while moving left. */
export function tilt(phase: number, f: Flutter): number {
  return f.rock === 0 ? 0 : f.rock * Math.sin(phase * f.swayF);
}

/** Width of the leaf as it tumbles, 0.3 (edge-on, never a bare line) to 1 (flat). */
export function flipScale(flipPhase: number): number {
  return 0.3 + 0.7 * Math.abs(Math.cos(flipPhase));
}

/** A leaf falls faster edge-on than flat: 0.85 of its base speed when flat, 1.15 when edge-on. */
export function fallSpeedFactor(scale: number): number {
  return 1.15 - 0.3 * ((scale - 0.3) / 0.7);
}
