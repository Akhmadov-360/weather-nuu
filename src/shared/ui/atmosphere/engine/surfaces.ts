/** The top edge of a card in window coordinates. */
export type Surface = { x: number; width: number; top: number; /** Stable between measurements, to keep a card's snow cap. */ id?: number; /** Bottom edge, so particles can be kept out of the card body. */ bottom?: number };

/**
 * A particle that fell through a card's top edge this frame, with the x where it crossed.
 * With several edges in the way, the highest one (the first it reaches) catches it.
 */
export function landOn(
  surfaces: readonly Surface[],
  prev: { x: number; y: number },
  next: { x: number; y: number },
): { surface: Surface; x: number } | null {
  if (next.y <= prev.y) return null;
  let best: { surface: Surface; x: number } | null = null;
  for (const surface of surfaces) {
    if (!(prev.y < surface.top && next.y >= surface.top)) continue;
    const t = (surface.top - prev.y) / (next.y - prev.y);
    const x = prev.x + (next.x - prev.x) * t;
    if (x < surface.x || x > surface.x + surface.width) continue;
    if (!best || surface.top < best.surface.top) best = { surface, x };
  }
  return best;
}

export const CAP_MAX = 5;
const COLUMN = 4;
/** How much of its neighbour's growth a column takes: the cap is a soft mound, not a spike. */
const SPREAD = [1, 0.5, 0.25];

export type SnowCap = { heights: number[]; width: number };

export function createCap(width: number): SnowCap {
  return { heights: new Array<number>(Math.max(1, Math.ceil(width / COLUMN))).fill(0), width };
}

/** Snow that landed at `x` (relative to the card's left edge): raises that column and, less so, its neighbours. */
export function growCap(cap: SnowCap, x: number, amount: number): void {
  if (x < 0 || x >= cap.width) return;
  const centre = Math.floor(x / COLUMN);
  for (let d = 0; d < SPREAD.length; d++) {
    const limit = CAP_MAX * (1 - 0.25 * d);
    for (const i of d === 0 ? [centre] : [centre - d, centre + d]) {
      if (i < 0 || i >= cap.heights.length) continue;
      cap.heights[i] = Math.min(limit, cap.heights[i]! + amount * SPREAD[d]!);
    }
  }
}

export function meltCap(cap: SnowCap, dtSeconds: number, ratePerSecond: number): void {
  const drop = dtSeconds * ratePerSecond;
  for (let i = 0; i < cap.heights.length; i++) cap.heights[i] = Math.max(0, cap.heights[i]! - drop);
}

export function capHeight(cap: SnowCap, x: number): number {
  const i = Math.floor(x / COLUMN);
  return cap.heights[i] ?? 0;
}
