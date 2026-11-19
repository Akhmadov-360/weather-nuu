import { describe, expect, it } from 'vitest';
import { fallSpeedFactor, flipScale, makeFlutter, swayVelocity, tilt } from './flutter';

/** A repeatable "random": the sequence 0.1, 0.2, ... wrapping at 1. */
function sequence(): () => number {
  let i = 0;
  return () => ((++i % 10) + 0) / 10;
}

describe('makeFlutter', () => {
  it('is repeatable for the same random source', () => {
    expect(makeFlutter('leaves', sequence())).toEqual(makeFlutter('leaves', sequence()));
  });

  it('keeps every parameter inside its range for the whole span of the random source', () => {
    for (const kind of ['leaves', 'petals', 'snow'] as const) {
      for (const r of [0, 0.25, 0.5, 0.75, 0.9999]) {
        const f = makeFlutter(kind, () => r);
        expect(f.swayF).toBeGreaterThanOrEqual(0.7);
        expect(f.swayF).toBeLessThanOrEqual(1.9);
        expect(f.swayA).toBeGreaterThanOrEqual(0.7);
        expect(f.swayA).toBeLessThanOrEqual(1.3);
        expect(Math.abs(f.spin)).toBeLessThanOrEqual(1);
        if (kind !== 'snow') expect(f.flipF).toBeGreaterThan(0);
      }
    }
  });

  it('gives snow no spin, no rocking and no tumbling: a flake only drifts', () => {
    const f = makeFlutter('snow', () => 0.7);
    expect(f.spin).toBe(0);
    expect(f.rock).toBe(0);
    expect(f.flipF).toBe(0);
  });

  it('makes two leaves differ: they must not sway in step', () => {
    const a = makeFlutter('leaves', () => 0.1);
    const b = makeFlutter('leaves', () => 0.9);
    expect(a.swayF).not.toBeCloseTo(b.swayF, 2);
  });
});

describe('swayVelocity', () => {
  const f = makeFlutter('leaves', () => 0.5);

  it('swings both ways and averages out over a whole period, so a leaf does not drift sideways on its own', () => {
    const period = (2 * Math.PI) / f.swayF;
    let sum = 0;
    const steps = 2000;
    for (let i = 0; i < steps; i++) sum += swayVelocity((i / steps) * period, f, 30);
    expect(Math.abs(sum / steps)).toBeLessThan(0.05);
    expect(swayVelocity(Math.PI / (2 * f.swayF), f, 30)).toBeGreaterThan(0);
    expect(swayVelocity((3 * Math.PI) / (2 * f.swayF), f, 30)).toBeLessThan(0);
  });

  it('changes smoothly from frame to frame even when frame times wobble (no jerks at 60 fps)', () => {
    let ph = 0;
    let prev = swayVelocity(ph, f, 36);
    let worst = 0;
    for (let i = 0; i < 600; i++) {
      const dt = 1 / 60 + (i % 3 === 0 ? 0.004 : -0.002); // 14.7 to 20.7 ms
      ph += dt;
      const v = swayVelocity(ph, f, 36);
      worst = Math.max(worst, Math.abs(v - prev));
      prev = v;
    }
    // At most a couple of px/s change per frame for a 36 px/s sway.
    expect(worst).toBeLessThan(3);
  });
});

describe('tilt', () => {
  it('leans with the direction of travel and stays within the leaf rocking limit', () => {
    const f = makeFlutter('leaves', () => 0.5);
    const right = swayVelocity(Math.PI / (2 * f.swayF), f, 30);
    expect(Math.sign(tilt(Math.PI / (2 * f.swayF), f))).toBe(Math.sign(right));
    for (let ph = 0; ph < 20; ph += 0.1) expect(Math.abs(tilt(ph, f))).toBeLessThanOrEqual(f.rock + 1e-9);
  });

  it('is zero for a snowflake', () => {
    expect(tilt(1.3, makeFlutter('snow', () => 0.5))).toBe(0);
  });
});

describe('flipScale and fallSpeedFactor', () => {
  it('never narrows a leaf to nothing', () => {
    for (let ph = 0; ph < 20; ph += 0.05) {
      const s = flipScale(ph);
      expect(s).toBeGreaterThanOrEqual(0.3 - 1e-9);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it('lets a leaf fall faster edge-on than flat, within 15 percent of its base speed', () => {
    expect(fallSpeedFactor(1)).toBeCloseTo(0.85, 5);
    expect(fallSpeedFactor(0.3)).toBeCloseTo(1.15, 5);
    expect(fallSpeedFactor(0.3)).toBeGreaterThan(fallSpeedFactor(1));
  });
});
