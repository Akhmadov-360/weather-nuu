import type { CategoryId } from './types';

/**
 * Badge tone for a category. Declared here rather than imported so this
 * module stays free of any dependency on the weather domain; callers map it
 * onto their own tone type (a structural match).
 */
export type AqiTone = 'good' | 'warn' | 'bad';

const TONES: Record<CategoryId, AqiTone> = {
  good: 'good',
  moderate: 'warn',
  unhealthy_sensitive: 'warn',
  unhealthy: 'bad',
  very_unhealthy: 'bad',
  hazardous: 'bad',
};

export function categoryTone(id: CategoryId): AqiTone {
  return TONES[id];
}

/** Name of the CSS custom property holding the category's fill colour (defined per theme in the stylesheet). */
export function categoryCssVar(id: CategoryId): string {
  return `--aqi-${id}`;
}

/** Name of the CSS custom property holding the category's text colour. */
export function categoryTextCssVar(id: CategoryId): string {
  return `--aqi-${id}-text`;
}
