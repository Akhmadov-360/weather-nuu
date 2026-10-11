/** Radii are in units of a 340-wide viewBox; the outermost ring is 940 hPa, the innermost 1040 hPa. */
const MIN_LEVEL = 940;
const MAX_LEVEL = 1040;
const STEP = 10;
const R_OUTER = 150;
const R_INNER = 36;

export type IsobarRing = { level: number; r: number; labelled: boolean };

const clampLevel = (p: number) => Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, p));
/** High pressure sits at the centre, as on a synoptic map. */
const radiusOf = (level: number) => R_OUTER - ((level - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL)) * (R_OUTER - R_INNER);

/**
 * Geometry of the pressure card's isobars: a ring every 10 hPa, the ring of the
 * current value, and (given the 3-hour change) the ring of the value three
 * hours ago. Values outside the drawn range sit on the nearest ring.
 */
export function isobarRings(
  pressure: number,
  delta: number | null,
): {
  rings: IsobarRing[];
  current: { level: number; r: number; clamped: boolean };
  previous: { level: number; r: number } | null;
} {
  const rings: IsobarRing[] = [];
  for (let level = MIN_LEVEL; level <= MAX_LEVEL; level += STEP) {
    rings.push({ level, r: radiusOf(level), labelled: (level - MIN_LEVEL) % (2 * STEP) === 0 });
  }
  const level = clampLevel(pressure);
  const previousLevel = delta === null ? null : clampLevel(pressure - delta);
  return {
    rings,
    current: { level, r: radiusOf(level), clamped: level !== pressure },
    previous: previousLevel === null ? null : { level: previousLevel, r: radiusOf(previousLevel) },
  };
}
