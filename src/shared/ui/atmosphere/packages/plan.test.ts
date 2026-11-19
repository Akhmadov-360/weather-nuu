import { describe, expect, it } from 'vitest';
import type { EngineLayer } from '../engine/engine';
import { packagePlan } from './plan';

const layer = (kind: string, intensity: number, windX = 0): EngineLayer => ({ kind, intensity, windX });

describe('packagePlan: what the packages draw and what stays with the engine', () => {
  it('hands leaves, petals, snow and rain to the packages and keeps everything else for the engine', () => {
    const layers = [layer('leaves', 0.35), layer('snow', 0.5), layer('rain', 0.5), layer('petals', 0.3), layer('clouds', 0.6), layer('lightning', 0.4), layer('hail', 0.5), layer('motes', 0.3)];
    const plan = packagePlan(layers, 120);
    expect(plan.leaves).toBeDefined();
    expect(plan.petals).toBeDefined();
    expect(plan.snow).toBeDefined();
    expect(plan.rain).toBeDefined();
    expect(plan.rest.map((l) => l.kind)).toEqual(['clouds', 'lightning', 'hail', 'motes']);
  });

  it('plans nothing for a kind that is not in the scene', () => {
    const plan = packagePlan([layer('stars', 0.6)], 120);
    expect(plan.leaves).toBeUndefined();
    expect(plan.snow).toBeUndefined();
    expect(plan.rest).toHaveLength(1);
  });

  it('scales the count with the layer intensity and with the device budget (a phone gets half)', () => {
    const desktop = packagePlan([layer('snow', 0.6)], 120).snow!.count;
    const phone = packagePlan([layer('snow', 0.6)], 60).snow!.count;
    expect(desktop).toBeGreaterThan(phone);
    expect(phone).toBe(Math.round(desktop / 2));
    expect(packagePlan([layer('snow', 0.3)], 120).snow!.count).toBeLessThan(desktop);
  });

  it('never plans a zero count for a layer that is present, but draws nothing when the budget is zero', () => {
    expect(packagePlan([layer('leaves', 0.001)], 120).leaves!.count).toBeGreaterThanOrEqual(1);
    const none = packagePlan([layer('leaves', 0.35), layer('snow', 0.5)], 0);
    expect(none.leaves).toBeUndefined();
    expect(none.snow).toBeUndefined();
  });

  it('keeps the wind range ordered whatever the wind does, so a gale to the left does not break a package', () => {
    for (const windX of [-200, -30, 0, 30, 200]) {
      const plan = packagePlan([layer('leaves', 0.35, windX), layer('snow', 0.5, windX)], 120);
      expect(plan.leaves!.wind[0]).toBeLessThanOrEqual(plan.leaves!.wind[1]);
      expect(plan.snow!.wind[0]).toBeLessThanOrEqual(plan.snow!.wind[1]);
    }
  });

  it('blows to the right with a positive wind and to the left with a negative one', () => {
    const right = packagePlan([layer('leaves', 0.35, 60)], 120).leaves!.wind;
    const left = packagePlan([layer('leaves', 0.35, -60)], 120).leaves!.wind;
    expect(right[1]).toBeGreaterThan(left[1]);
  });

  it('limits the rain slant to a believable angle', () => {
    expect(packagePlan([layer('rain', 0.7, 1000)], 120).rain!.angle).toBe(20);
    expect(packagePlan([layer('rain', 0.7, -1000)], 120).rain!.angle).toBe(-20);
    expect(packagePlan([layer('rain', 0.7, 0)], 120).rain!.angle).toBe(0);
  });
});
