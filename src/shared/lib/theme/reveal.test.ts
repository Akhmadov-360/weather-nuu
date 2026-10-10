import { describe, expect, it } from 'vitest';
import { nextTheme, revealRadius } from './reveal';

describe('nextTheme', () => {
  it('flips what is shown', () => {
    expect(nextTheme('dark')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
  });
});

describe('revealRadius', () => {
  it('is the distance to the farthest corner of the viewport', () => {
    expect(revealRadius(0, 0, 300, 400)).toBe(500);
    expect(revealRadius(300, 400, 300, 400)).toBe(500);
    expect(revealRadius(150, 200, 300, 400)).toBe(250);
  });

  it('still covers the page when the point is outside the viewport', () => {
    expect(revealRadius(-300, 0, 300, 400)).toBe(Math.hypot(600, 400));
  });
});
