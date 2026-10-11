/** How many particles of each size the dust field draws for a reading (µg/m³). */
export type DustParticleCounts = { fine: number; coarse: number };

const FINE_MIN = 20;
const FINE_MAX = 240;
const COARSE_MIN = 2;
const COARSE_MAX = 22;
/** Readings at and above these values fill the field completely (the card's bar also ends at 150). */
const PM25_FULL = 150;
const PM10_FULL = 250;

const lerp = (min: number, max: number, share: number) => Math.round(min + (max - min) * Math.min(1, Math.max(0, share)));

/**
 * Fine particles stand for PM2.5, coarse ones for PM10. Clean air still shows
 * a few of each, so the card never looks empty or broken; counts are capped so
 * the canvas stays cheap.
 */
export function dustParticleCounts(pm25: number, pm10: number | null): DustParticleCounts {
  return {
    fine: lerp(FINE_MIN, FINE_MAX, pm25 / PM25_FULL),
    coarse: pm10 === null ? COARSE_MIN : lerp(COARSE_MIN, COARSE_MAX, pm10 / PM10_FULL),
  };
}
