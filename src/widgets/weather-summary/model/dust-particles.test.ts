import { describe, expect, it } from 'vitest';
import { dustParticleCounts } from './dust-particles';

describe('dustParticleCounts', () => {
  it('keeps a few particles in clean air', () => {
    expect(dustParticleCounts(0, 0)).toEqual({ fine: 20, coarse: 2 });
  });

  it('grows with the reading', () => {
    const low = dustParticleCounts(9, 14);
    const high = dustParticleCounts(97, 150);
    expect(high.fine).toBeGreaterThan(low.fine);
    expect(high.coarse).toBeGreaterThan(low.coarse);
  });

  it('is capped for hazardous readings', () => {
    expect(dustParticleCounts(900, 1500)).toEqual({ fine: 240, coarse: 22 });
  });

  it('falls back to the minimum coarse count when PM10 is missing', () => {
    expect(dustParticleCounts(50, null).coarse).toBe(2);
  });
});
