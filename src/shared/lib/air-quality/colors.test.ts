import { describe, expect, it } from 'vitest';
import { categoryCssVar, categoryTextCssVar, categoryTone } from './colors';
import type { CategoryId } from './types';

const ORDER: CategoryId[] = [
  'good',
  'moderate',
  'unhealthy_sensitive',
  'unhealthy',
  'very_unhealthy',
  'hazardous',
];

describe('categoryTone', () => {
  it('maps the six categories to good, warn, warn, bad, bad, bad', () => {
    expect(ORDER.map(categoryTone)).toEqual(['good', 'warn', 'warn', 'bad', 'bad', 'bad']);
  });
});

describe('CSS variable names', () => {
  it('names the fill variable after the category id', () => {
    expect(categoryCssVar('unhealthy_sensitive')).toBe('--aqi-unhealthy_sensitive');
    expect(categoryCssVar('good')).toBe('--aqi-good');
  });

  it('names the text variable with a -text suffix', () => {
    expect(categoryTextCssVar('good')).toBe('--aqi-good-text');
    expect(categoryTextCssVar('very_unhealthy')).toBe('--aqi-very_unhealthy-text');
  });
});
