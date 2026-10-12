import { describe, expect, it } from 'vitest';
import { capHeight, createCap, growCap, landOn, meltCap, CAP_MAX, type Surface } from './surfaces';

const card: Surface = { x: 100, width: 200, top: 300 };

describe('landOn', () => {
  it('lands a particle that crosses the top edge inside the card', () => {
    const hit = landOn([card], { x: 150, y: 295 }, { x: 152, y: 305 });
    expect(hit?.surface).toBe(card);
    expect(hit?.x).toBeGreaterThan(150);
    expect(hit?.x).toBeLessThan(153);
  });

  it('lets a particle beside the card fall past', () => {
    expect(landOn([card], { x: 50, y: 295 }, { x: 50, y: 305 })).toBeNull();
    expect(landOn([card], { x: 305, y: 295 }, { x: 305, y: 305 })).toBeNull();
  });

  it('does not catch a particle that is still above, already below, or rising', () => {
    expect(landOn([card], { x: 150, y: 280 }, { x: 150, y: 290 })).toBeNull();
    expect(landOn([card], { x: 150, y: 320 }, { x: 150, y: 330 })).toBeNull();
    expect(landOn([card], { x: 150, y: 305 }, { x: 150, y: 295 })).toBeNull();
  });

  it('picks the highest surface the particle crosses', () => {
    const lower: Surface = { x: 100, width: 200, top: 304 };
    const hit = landOn([lower, card], { x: 150, y: 290 }, { x: 150, y: 320 });
    expect(hit?.surface).toBe(card);
  });

  it('works with no surfaces', () => {
    expect(landOn([], { x: 0, y: 0 }, { x: 0, y: 10 })).toBeNull();
  });
});

describe('snow caps', () => {
  it('starts flat and rises where snow lands', () => {
    const cap = createCap(200);
    expect(capHeight(cap, 50)).toBe(0);
    growCap(cap, 50, 2);
    expect(capHeight(cap, 50)).toBeGreaterThan(0);
  });

  it('spreads a landing to the neighbours and never passes the maximum', () => {
    const cap = createCap(200);
    for (let i = 0; i < 500; i++) growCap(cap, 100, 1);
    expect(capHeight(cap, 100)).toBeLessThanOrEqual(CAP_MAX);
    expect(capHeight(cap, 100)).toBeGreaterThan(CAP_MAX - 0.5);
    expect(capHeight(cap, 106)).toBeGreaterThan(0);
    expect(capHeight(cap, 190)).toBe(0);
  });

  it('ignores a landing outside the card', () => {
    const cap = createCap(200);
    growCap(cap, -5, 2);
    growCap(cap, 205, 2);
    expect(capHeight(cap, 0)).toBe(0);
    expect(capHeight(cap, 199)).toBe(0);
  });

  it('melts away in about a minute', () => {
    const cap = createCap(200);
    for (let i = 0; i < 500; i++) growCap(cap, 100, 1);
    meltCap(cap, 30, CAP_MAX / 60);
    expect(capHeight(cap, 100)).toBeGreaterThan(0);
    meltCap(cap, 31, CAP_MAX / 60);
    expect(capHeight(cap, 100)).toBe(0);
  });
});
