import { CAP_MAX, createCap, growCap, landOn, meltCap, type SnowCap, type Surface } from './surfaces';

export type EngineLayer = { kind: string; intensity: number; windX: number };
export type EngineOptions = {
  /** Most falling particles on screen. */
  budget: number;
  dark: boolean;
  /** Garlands along the card edges (New Year). */
  lights: boolean;
  getSurfaces: () => Surface[];
  /** Reports frame times to the FPS governor. */
  onFrame?: (frameMs: number) => void;
};

type FallingKind = 'snow' | 'rain' | 'hail' | 'petals' | 'leaves' | 'motes';
const FALLING: readonly FallingKind[] = ['snow', 'rain', 'hail', 'petals', 'leaves', 'motes'];

type Particle = { kind: FallingKind; x: number; y: number; vx: number; vy: number; r: number; ph: number; rot: number; bounced: boolean };
type Rest = { id: number; dx: number; kind: 'petals' | 'leaves'; age: number; life: number; r: number; rot: number };
type Splash = { x: number; y: number; vx: number; vy: number; age: number };
type Ring = { x: number; y: number; age: number };

type Palette = Record<'snow' | 'cap' | 'capEdge' | 'rain' | 'hail' | 'petal' | 'leaf' | 'mote' | 'frost' | 'glow', string>;
const COLOURS: Record<'light' | 'dark', Palette> = {
  light: { snow: 'rgba(110,140,185,0.85)', cap: 'rgba(255,255,255,0.98)', capEdge: 'rgba(150,175,210,0.9)', rain: 'rgba(95,135,200,0.7)', hail: 'rgba(120,150,190,0.9)', petal: '#E58BAA', leaf: '#B8651F', mote: 'rgba(190,160,110,0.8)', frost: 'rgba(120,160,210,0.7)', glow: '#FFF3C4' },
  dark: { snow: 'rgba(238,241,250,0.9)', cap: 'rgba(245,247,252,0.95)', capEdge: 'rgba(170,185,215,0.9)', rain: 'rgba(170,200,255,0.6)', hail: 'rgba(210,225,250,0.9)', petal: '#F4B6C8', leaf: '#E0954A', mote: 'rgba(220,195,150,0.7)', frost: 'rgba(190,215,255,0.7)', glow: '#FFE9A8' },
};

/** True when a point is inside a card's body: nothing is drawn there, a particle that gets in is sent back to the top. */
function insideCard(surfaces: readonly Surface[], x: number, y: number): boolean {
  return surfaces.some((s) => s.bottom !== undefined && y > s.top && y < s.bottom && x > s.x - 14 && x < s.x + s.width + 14);
}

const BULBS = ['#FF5C5C', '#FFC857', '#5CD68A', '#5CA8FF', '#E27FD0'];
const SKY_HEIGHT = 260;

/**
 * The canvas scene: falling particles that land on the top edges of cards,
 * snow caps that grow and melt there, and the sky effects (stars, rays,
 * clouds, fog, lightning). Draws only between start() and stop(), and never
 * inside a card: particles stop at its edge.
 */
export class AtmosphereEngine {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private frame = 0;
  private last = 0;
  private time = 0;
  private layers: EngineLayer[] = [];
  private particles: Particle[] = [];
  private rests: Rest[] = [];
  private splashes: Splash[] = [];
  private rings: Ring[] = [];
  private caps = new Map<number, SnowCap>();
  private flash = 0;
  private nextFlash = 3;
  private stars: { x: number; y: number; ph: number }[] = [];
  private observer: ResizeObserver;

  constructor(private canvas: HTMLCanvasElement, private opts: EngineOptions) {
    this.ctx = canvas.getContext('2d')!;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
  }

  setOptions(opts: Partial<EngineOptions>): void {
    this.opts = { ...this.opts, ...opts };
    this.syncParticles();
  }

  setLayers(layers: EngineLayer[]): void {
    this.layers = layers;
    this.syncParticles();
  }

  start(): void {
    if (this.frame) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  stop(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  dispose(): void {
    this.stop();
    this.observer.disconnect();
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  private resize(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.stars = Array.from({ length: 36 }, () => ({ x: Math.random() * this.w, y: Math.random() * SKY_HEIGHT, ph: Math.random() * 6 }));
  }

  private layer(kind: string): EngineLayer | undefined {
    return this.layers.find((l) => l.kind === kind);
  }

  private get wind(): number {
    return this.layers[0]?.windX ?? 0;
  }

  /** The target number of particles of each falling kind, within the shared budget. */
  private syncParticles(): void {
    const wanted = new Map<FallingKind, number>();
    let total = 0;
    for (const kind of FALLING) {
      const layer = this.layer(kind);
      const n = layer ? Math.round(this.opts.budget * Math.min(1, layer.intensity)) : 0;
      wanted.set(kind, n);
      total += n;
    }
    const scale = total > this.opts.budget ? this.opts.budget / total : 1;
    for (const kind of FALLING) {
      const target = Math.round((wanted.get(kind) ?? 0) * scale);
      const have = this.particles.filter((p) => p.kind === kind);
      if (have.length > target) {
        const drop = new Set(have.slice(target));
        this.particles = this.particles.filter((p) => !drop.has(p));
      }
      for (let i = have.length; i < target; i++) this.particles.push(this.spawn(kind, true));
    }
  }

  private spawn(kind: FallingKind, anywhere: boolean): Particle {
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const base = { kind, x: Math.random() * this.w, y: anywhere ? Math.random() * this.h : -10, ph: Math.random() * 6, rot: Math.random() * 6, bounced: false };
    switch (kind) {
      case 'snow':
        return { ...base, vx: 0, vy: rnd(28, 55), r: rnd(1.2, 3) };
      case 'rain':
        return { ...base, vx: 0, vy: rnd(520, 720), r: rnd(0.8, 1.2) };
      case 'hail':
        return { ...base, vx: 0, vy: rnd(560, 700), r: rnd(1.6, 2.6) };
      case 'petals':
        return { ...base, vx: 0, vy: rnd(36, 64), r: rnd(3, 5) };
      case 'leaves':
        return { ...base, vx: 0, vy: rnd(46, 84), r: rnd(4, 6.5) };
      default:
        return { ...base, y: anywhere ? Math.random() * this.h : this.h + 6, vx: 0, vy: -rnd(3, 9), r: rnd(0.8, 1.8) };
    }
  }

  private capFor(surface: Surface): SnowCap {
    const id = surface.id ?? 0;
    let cap = this.caps.get(id);
    if (!cap || Math.abs(cap.width - surface.width) > 2) {
      cap = createCap(surface.width);
      this.caps.set(id, cap);
    }
    return cap;
  }

  private tick = (now: number): void => {
    const frameMs = now - this.last;
    const dt = Math.min(0.05, frameMs / 1000);
    this.last = now;
    this.time += dt;
    this.opts.onFrame?.(frameMs);
    this.update(dt);
    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    const surfaces = this.opts.getSurfaces();
    const wind = this.wind;
    const snowing = Boolean(this.layer('snow'));

    for (const p of this.particles) {
      const prev = { x: p.x, y: p.y };
      p.ph += dt;
      const sway = p.kind === 'snow' ? 14 : p.kind === 'petals' ? 26 : p.kind === 'leaves' ? 36 : p.kind === 'motes' ? 6 : 0;
      const slant = p.kind === 'rain' || p.kind === 'hail' ? wind * 1.6 : wind * 0.7;
      p.x += (slant + Math.sin(p.ph * 1.4) * sway) * dt;
      p.y += p.vy * dt;
      p.rot += dt * (p.kind === 'leaves' ? 2.2 : 1.2);

      if (p.kind !== 'motes') {
        const hit = landOn(surfaces, prev, { x: p.x, y: p.y });
        if (hit) this.land(p, hit.surface, hit.x);
        else if (insideCard(surfaces, p.x, p.y)) Object.assign(p, this.spawn(p.kind, false));
      }
      if (p.x < -20) p.x = this.w + 10;
      if (p.x > this.w + 20) p.x = -10;
      const out = p.kind === 'motes' ? p.y < -10 : p.y > this.h + 10;
      if (out) Object.assign(p, this.spawn(p.kind, false));
    }

    for (const r of this.rests) r.age += dt;
    this.rests = this.rests.filter((r) => r.age < r.life);
    for (const s of this.splashes) {
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 380 * dt;
    }
    this.splashes = this.splashes.filter((s) => s.age < 0.45);
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < 0.6);

    const meltRate = snowing ? CAP_MAX / 240 : CAP_MAX / 60;
    for (const cap of this.caps.values()) meltCap(cap, dt, meltRate);

    if (this.layer('lightning')) {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) {
        this.flash = 1;
        this.nextFlash = 4 + Math.random() * 6;
      }
    }
    this.flash = Math.max(0, this.flash - dt * 3.2);
  }

  private land(p: Particle, surface: Surface, x: number): void {
    switch (p.kind) {
      case 'snow':
        growCap(this.capFor(surface), x - surface.x, 0.35);
        Object.assign(p, this.spawn('snow', false));
        break;
      case 'rain':
        for (let i = 0; i < 3; i++) this.splashes.push({ x, y: surface.top, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 90, age: 0 });
        this.rings.push({ x, y: surface.top, age: 0 });
        Object.assign(p, this.spawn('rain', false));
        break;
      case 'hail':
        if (p.bounced) {
          Object.assign(p, this.spawn('hail', false));
        } else {
          p.bounced = true;
          p.vy = -p.vy * 0.28;
          p.y = surface.top - 1;
        }
        break;
      case 'petals':
      case 'leaves':
        this.rests.push({ id: surface.id ?? 0, dx: x - surface.x, kind: p.kind, age: 0, life: 4 + Math.random() * 5, r: p.r, rot: p.rot });
        Object.assign(p, this.spawn(p.kind, false));
        break;
    }
  }

  private draw(): void {
    const { ctx, w, h } = this;
    const c = COLOURS[this.opts.dark ? 'dark' : 'light'];
    const surfaces = this.opts.getSurfaces();
    ctx.clearRect(0, 0, w, h);

    this.drawSky(c);

    for (const p of this.particles) {
      switch (p.kind) {
        case 'snow':
        case 'motes':
          ctx.globalAlpha = p.kind === 'motes' ? 0.55 : 0.9;
          ctx.fillStyle = p.kind === 'snow' ? c.snow : c.mote;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'rain':
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = c.rain;
          ctx.lineWidth = p.r;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - this.wind * 0.03 - 1, p.y - 11);
          ctx.stroke();
          break;
        case 'hail':
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = c.hail;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'petals':
        case 'leaves':
          this.drawLeaf(p.x, p.y, p.r, p.rot, p.kind === 'petals' ? c.petal : c.leaf, 0.85);
          break;
      }
    }
    ctx.globalAlpha = 1;

    const tops = new Map(surfaces.map((s) => [s.id ?? 0, s]));
    for (const r of this.rests) {
      const s = tops.get(r.id);
      if (!s) continue;
      const fade = Math.min(1, (r.life - r.age) / 1);
      this.drawLeaf(s.x + r.dx, s.top - r.r * 0.5, r.r, r.rot, r.kind === 'petals' ? c.petal : c.leaf, 0.85 * fade);
    }

    for (const s of surfaces) {
      const cap = this.caps.get(s.id ?? 0);
      if (cap) this.drawCap(cap, s, c);
    }

    ctx.fillStyle = c.rain;
    for (const sp of this.splashes) {
      ctx.globalAlpha = 1 - sp.age / 0.45;
      ctx.fillRect(sp.x, sp.y, 1.6, 1.6);
    }
    ctx.strokeStyle = c.rain;
    ctx.lineWidth = 1;
    for (const r of this.rings) {
      ctx.globalAlpha = 0.6 * (1 - r.age / 0.6);
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, 2 + r.age * 16, 0.8 + r.age * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (this.layer('frost')) this.drawFrost(surfaces, c.frost);
    if (this.opts.lights) this.drawLights(surfaces, c.glow);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${0.28 * this.flash})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private drawLeaf(x: number, y: number, r: number, rot: number, colour: string, alpha: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(rot * 1.3)));
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawCap(cap: SnowCap, s: Surface, c: Palette): void {
    const { ctx } = this;
    if (!cap.heights.some((v) => v > 0.05)) return;
    const step = s.width / cap.heights.length;
    ctx.beginPath();
    ctx.moveTo(s.x, s.top + 0.5);
    cap.heights.forEach((v, i) => ctx.lineTo(s.x + (i + 0.5) * step, s.top + 0.5 - v));
    ctx.lineTo(s.x + s.width, s.top + 0.5);
    ctx.closePath();
    ctx.fillStyle = c.cap;
    ctx.fill();
    ctx.strokeStyle = c.capEdge;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  private drawSky(c: Palette): void {
    const { ctx, w } = this;
    const stars = this.layer('stars');
    if (stars) {
      ctx.fillStyle = this.opts.dark ? '#FFFFFF' : '#8FA0C8';
      for (const s of this.stars) {
        ctx.globalAlpha = (0.25 + 0.5 * Math.abs(Math.sin(this.time * 1.2 + s.ph))) * stars.intensity;
        ctx.fillRect(s.x, s.y, 1.6, 1.6);
      }
    }
    const rays = this.layer('rays');
    if (rays) {
      for (let i = 0; i < 3; i++) {
        const x = w * (0.55 + i * 0.16);
        ctx.globalAlpha = (0.05 + 0.03 * Math.sin(this.time * 0.4 + i)) * rays.intensity * (this.opts.dark ? 1.4 : 1);
        ctx.fillStyle = c.glow;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 70, 0);
        ctx.lineTo(x - 110, SKY_HEIGHT);
        ctx.lineTo(x - 190, SKY_HEIGHT);
        ctx.closePath();
        ctx.fill();
      }
    }
    const clouds = this.layer('clouds');
    if (clouds) {
      ctx.fillStyle = this.opts.dark ? '#8A93C0' : '#9AA3C2';
      for (let i = 0; i < 4; i++) {
        const x = ((this.time * (6 + i * 2) + i * w * 0.3) % (w + 300)) - 150;
        ctx.globalAlpha = 0.09 * clouds.intensity;
        ctx.beginPath();
        ctx.ellipse(x, 60 + i * 34, 130, 26, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const fog = this.layer('fog');
    if (fog) {
      const grad = ctx.createLinearGradient(0, this.h - 220, 0, this.h);
      grad.addColorStop(0, 'rgba(180,190,215,0)');
      grad.addColorStop(1, `rgba(180,190,215,${0.35 * fog.intensity})`);
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.fillRect(0, this.h - 220, w, 220);
    }
    const shimmer = this.layer('shimmer');
    if (shimmer) {
      ctx.globalAlpha = 0.07 * shimmer.intensity * 2;
      ctx.strokeStyle = this.opts.dark ? '#F2866B' : '#D9731A';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const y = 40 + i * 30 + Math.sin(x / 26 + this.time * 2 + i) * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawFrost(surfaces: Surface[], colour: string): void {
    const { ctx } = this;
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    for (const s of surfaces) {
      ctx.beginPath();
      for (let x = 0; x < s.width; x += 9) {
        const len = 2 + ((Math.sin(x * 12.9898 + (s.id ?? 0) * 78.233) * 43758.5453) % 1 + 1) % 1 * 4;
        ctx.moveTo(s.x + x, s.top);
        ctx.lineTo(s.x + x + 1.5, s.top - len);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawLights(surfaces: Surface[], glow: string): void {
    const { ctx } = this;
    for (const s of surfaces) {
      ctx.strokeStyle = this.opts.dark ? 'rgba(200,210,235,0.5)' : 'rgba(90,100,130,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const bulbs: { x: number; y: number }[] = [];
      for (let x = 0; x <= s.width; x += 22) {
        const y = s.top - 3 - Math.sin((x / 22) * 1.6) * 2.5;
        if (x === 0) ctx.moveTo(s.x + x, y);
        else ctx.lineTo(s.x + x, y);
        bulbs.push({ x: s.x + x, y });
      }
      ctx.stroke();
      bulbs.forEach((b, i) => {
        const twinkle = 0.55 + 0.45 * Math.sin(this.time * 2.4 + i * 1.7 + (s.id ?? 0));
        ctx.globalAlpha = 0.25 * twinkle;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(b.x, b.y + 3, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5 + 0.5 * twinkle;
        ctx.fillStyle = BULBS[i % BULBS.length]!;
        ctx.beginPath();
        ctx.arc(b.x, b.y + 3, 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.globalAlpha = 1;
  }
}
