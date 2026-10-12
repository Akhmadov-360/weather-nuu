/** Petal and leaf shapes, and the garland strand. Pure drawing helpers: no state, no DOM. */

const TAU = Math.PI * 2;

/** An apricot-blossom petal: a rounded teardrop with a small notch at the tip, shaded from the base to the tip. */
export function drawPetal(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, colour: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  // The petal turns over as it falls: its width follows |sin|, so it never vanishes completely.
  ctx.scale(0.35 + 0.65 * Math.abs(Math.sin(rot * 1.3)), 1);
  const grad = ctx.createLinearGradient(0, r, 0, -r);
  grad.addColorStop(0, 'rgba(0,0,0,0.18)');
  grad.addColorStop(0.15, colour);
  grad.addColorStop(1, 'rgba(255,255,255,0.55)');
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.bezierCurveTo(r * 1.1, r * 0.5, r * 1.0, -r * 0.9, r * 0.2, -r);
  ctx.quadraticCurveTo(0, -r * 0.78, -r * 0.2, -r);
  ctx.bezierCurveTo(-r * 1.0, -r * 0.9, -r * 1.1, r * 0.5, 0, r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = grad;
  ctx.globalAlpha = alpha * 0.55;
  ctx.fill();
  ctx.restore();
}

/** Half of a plane-tree leaf outline, as [x, y] pairs in units of the radius (the other half is mirrored). */
const LEAF_HALF: ReadonlyArray<readonly [number, number]> = [
  [0, -1.0],
  [0.2, -0.58],
  [0.62, -0.74],
  [0.5, -0.24],
  [0.98, -0.02],
  [0.46, 0.18],
  [0.58, 0.64],
  [0.14, 0.46],
  [0, 0.62],
];

/** A five-lobed autumn leaf with a stem and a midrib; it tumbles by narrowing and widening as it turns. */
export function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, colour: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(0.4 + 0.6 * Math.abs(Math.sin(rot * 1.1 + 0.6)), 1);
  ctx.fillStyle = colour;
  ctx.beginPath();
  LEAF_HALF.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px * r, py * r) : ctx.lineTo(px * r, py * r)));
  for (let i = LEAF_HALF.length - 1; i >= 0; i--) {
    const [px, py] = LEAF_HALF[i]!;
    ctx.lineTo(-px * r, py * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = Math.max(0.6, r * 0.09);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.95);
  ctx.lineTo(0, -r * 0.8);
  ctx.stroke();
  ctx.restore();
}

const BULBS = ['#FF5C5C', '#FFC857', '#5CD68A', '#5CA8FF', '#E27FD0'];

/**
 * A string of lights along a horizontal edge: a gently sagging wire and bulbs
 * that twinkle out of step. `dir` is 1 when the strand hangs below `y` and -1
 * when it rises above it, so it can sit on the outside of an edge either way.
 */
export function drawStrand(
  ctx: CanvasRenderingContext2D,
  x: number,
  width: number,
  y: number,
  seed: number,
  time: number,
  glow: string,
  dark: boolean,
  dir: 1 | -1,
): void {
  ctx.strokeStyle = dark ? 'rgba(200,210,235,0.5)' : 'rgba(90,100,130,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const bulbs: { x: number; y: number }[] = [];
  for (let dx = 0; dx <= width; dx += 22) {
    const wy = y + dir * (3 + Math.sin((dx / 22) * 1.6) * 2.5);
    if (dx === 0) ctx.moveTo(x + dx, wy);
    else ctx.lineTo(x + dx, wy);
    bulbs.push({ x: x + dx, y: wy });
  }
  ctx.stroke();
  bulbs.forEach((b, i) => {
    const twinkle = 0.55 + 0.45 * Math.sin(time * 2.4 + i * 1.7 + seed);
    const by = b.y + dir * 3;
    ctx.globalAlpha = 0.25 * twinkle;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(b.x, by, 6, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.5 + 0.5 * twinkle;
    ctx.fillStyle = BULBS[i % BULBS.length]!;
    ctx.beginPath();
    ctx.arc(b.x, by, 2.4, 0, TAU);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}
