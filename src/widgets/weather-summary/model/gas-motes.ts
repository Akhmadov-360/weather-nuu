/** How many motes drift behind a gas card: a few at rest, more as the reading climbs, never more than `max`. */
export function gasMoteCount(value: number | null | undefined, fullAt: number, min = 5, max = 30): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return min;
  return Math.round(min + (max - min) * Math.min(1, value / fullAt));
}
