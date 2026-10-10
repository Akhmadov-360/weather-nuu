/**
 * Where the physical stations are. The time shown on the dashboard is the
 * station's, not the visitor's, so a visitor in another zone is not misled.
 * Coordinates are the university campus (Almazar district, Tashkent).
 */
export const STATION = {
  name: 'Tashkent',
  lat: 41.343,
  lon: 69.205,
  timeZone: 'Asia/Tashkent',
} as const;
