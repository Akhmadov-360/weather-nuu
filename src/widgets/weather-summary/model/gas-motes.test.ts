import { describe, expect, it } from 'vitest';
import { gasMoteCount } from './gas-motes';

describe('gasMoteCount', () => {
  it('keeps a few motes when there is no reading', () => {
    expect(gasMoteCount(null, 1000)).toBe(5);
    expect(gasMoteCount(undefined, 1000)).toBe(5);
    expect(gasMoteCount(0, 1000)).toBe(5);
    expect(gasMoteCount(-4197, 1000)).toBe(5);
  });

  it('grows with the reading and is capped', () => {
    expect(gasMoteCount(500, 1000)).toBe(18);
    expect(gasMoteCount(1000, 1000)).toBe(30);
    expect(gasMoteCount(9000, 1000)).toBe(30);
  });
});
