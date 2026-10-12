import { describe, expect, it } from 'vitest';
import { createFpsGovernor, deviceCap, effectiveLevel, particleBudget, type DeviceSignals } from './tier';

const strong: DeviceSignals = { reducedMotion: false, saveData: false, memoryGb: 8, cores: 8, isPhone: false };

describe('deviceCap', () => {
  it('lets a normal desktop run everything', () => {
    expect(deviceCap(strong)).toBe('full');
  });

  it.each([
    ['reduced motion', { reducedMotion: true }],
    ['data saver', { saveData: true }],
    ['a 2g connection', { effectiveType: '2g' }],
    ['a 3g connection', { effectiveType: '3g' }],
    ['2 GB of memory', { memoryGb: 2 }],
    ['2 cores', { cores: 2 }],
  ] as const)('is calm with %s', (_name, over) => {
    expect(deviceCap({ ...strong, ...over })).toBe('calm');
  });

  it('does not penalise what the browser does not report', () => {
    expect(deviceCap({ reducedMotion: false, saveData: false, isPhone: false })).toBe('full');
  });

  it('lets a phone run full (the budget is smaller instead)', () => {
    expect(deviceCap({ ...strong, isPhone: true })).toBe('full');
  });
});

describe('effectiveLevel', () => {
  it('uses the cap when the user has not chosen', () => {
    expect(effectiveLevel(null, 'full', false)).toBe('full');
    expect(effectiveLevel(null, 'calm', false)).toBe('calm');
  });

  it('lets the governor lower an automatic level by one step', () => {
    expect(effectiveLevel(null, 'full', true)).toBe('calm');
    expect(effectiveLevel(null, 'calm', true)).toBe('calm');
  });

  it('obeys the user, even on a weak device, and the governor does not override a manual full', () => {
    expect(effectiveLevel('off', 'full', false)).toBe('off');
    expect(effectiveLevel('full', 'calm', false)).toBe('full');
    expect(effectiveLevel('full', 'full', true)).toBe('full');
    expect(effectiveLevel('calm', 'full', true)).toBe('calm');
  });
});

describe('particleBudget', () => {
  it('is 120 on a desktop, 60 on a phone, and zero below full', () => {
    expect(particleBudget('full', false)).toBe(120);
    expect(particleBudget('full', true)).toBe(60);
    expect(particleBudget('calm', false)).toBe(0);
    expect(particleBudget('off', false)).toBe(0);
  });
});

describe('createFpsGovernor', () => {
  /** Feeds frames until `ms` of wall time has passed; returns the last verdict. */
  const feed = (g: ReturnType<typeof createFpsGovernor>, frameMs: number, windowMs = 2000) => {
    let verdict: 'ok' | 'drop' = 'ok';
    for (let t = 0; t < windowMs; t += frameMs) verdict = g.sample(frameMs);
    return verdict;
  };

  it('stays ok at a healthy frame rate', () => {
    const g = createFpsGovernor();
    expect(feed(g, 16)).toBe('ok');
    expect(feed(g, 16)).toBe('ok');
  });

  it('drops after two slow windows in a row', () => {
    const g = createFpsGovernor();
    expect(feed(g, 40)).toBe('ok');
    expect(feed(g, 40)).toBe('drop');
  });

  it('forgives one slow window followed by a good one', () => {
    const g = createFpsGovernor();
    feed(g, 40);
    feed(g, 16);
    expect(feed(g, 40)).toBe('ok');
  });
});
