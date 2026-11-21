import { describe, expect, it } from 'vitest';
import { isKeyboardOpen } from './keyboard';

describe('isKeyboardOpen', () => {
  it('is false when the visible area is the whole window', () => {
    expect(isKeyboardOpen(800, 800)).toBe(false);
  });

  it('is true when the visible area has shrunk to the upper part (an on-screen keyboard)', () => {
    expect(isKeyboardOpen(430, 800)).toBe(true);
  });

  it('is false for a small change such as a browser bar', () => {
    expect(isKeyboardOpen(740, 800)).toBe(false);
  });

  it('draws the line at three quarters of the window', () => {
    expect(isKeyboardOpen(599, 800)).toBe(true);
    expect(isKeyboardOpen(600, 800)).toBe(false);
  });

  it('is false when a size is not known', () => {
    expect(isKeyboardOpen(0, 0)).toBe(false);
    expect(isKeyboardOpen(Number.NaN, 800)).toBe(false);
  });
});
