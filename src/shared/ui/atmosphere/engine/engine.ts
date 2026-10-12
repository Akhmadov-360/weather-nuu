import { HeaderEmitter, type HeaderRect } from './header-emitter';
import { drawLeaf, drawPetal, drawStrand } from './shapes';
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

/** depth: 0 far, 1 middle, 2 near (snow only; the rest stay in the middle). */
type Particle = { kind: FallingKind; depth: number; variant: number; x: number; y: number; vx: number; vy: number; r: number; ph: number; rot: number; bounced: boolean };
type Rest = { id: number; variant: number; dx: number; kind: 'petals' | 'leaves'; age: number; life: number; r: number; rot: number };
type Splash = { x: number; y: number; vx: number; vy: number; age: number };
type Ring = { x: number; y: number; age: number };

type Palette = Record<'snow' | 'cap' | 'capEdge' | 'rain' | 'hail' | 'mote' | 'frost' | 'glow', string> & { petals: string[]; leaves: string[] };
const COLOURS: Record<'light' | 'dark', Palette> = {
  light: { snow: 'rgba(110,140,185,0.85)', cap: 'rgba(255,255,255,0.98)', capEdge: 'rgba(150,175,210,0.9)', rain: 'rgba(95,135,200,0.7)', hail: 'rgba(120,150,190,0.9)', petals: ['#F2A6BF', '#E58BAA', '#F7C8D6', '#EE97B4'], leaves: ['#B8651F', '#9C4A1A', '#C78A2B', '#8A7A2A'], mote: 'rgba(190,160,110,0.8)', frost: 'rgba(120,160,210,0.7)', glow: '#FFF3C4' },
  dark: { snow: 'rgba(238,241,250,0.9)', cap: 'rgba(245,247,252,0.95)', capEdge: 'rgba(170,185,215,0.9)', rain: 'rgba(170,200,255,0.6)', hail: 'rgba(210,225,250,0.9)', petals: ['#F4B6C8', '#F8D2DE', '#E9A0B8', '#F6C2D2'], leaves: ['#E0954A', '#D97B3C', '#E8B25A', '#B9A140'], mote: 'rgba(220,195,150,0.7)', frost: 'rgba(190,215,255,0.7)', glow: '#FFE9A8' },
};

/** True when a point is inside a card's body: nothing is drawn there, a particle that gets in is sent back to the top. */
function insideCard(surfaces: readonly Surface[], x: number, y: number): boolean {
  return surfaces.some((s) => s.bottom !== undefined && y > s.top && y < s.bottom && x > s.x - 14 && x < s.x + s.width + 14);
}

const SKY_HEIGHT = 260;

/**
 * The canvas scene: falling particles that land on the top edges of cards,
 * snow caps that grow and melt there, and the sky effects (stars, rays,
 * clouds, fog, lightning). Draws only between start() and stop(), and never
 * inside a card: particles stop at its edge.
 */
export class AtmosphereEngine {
  private ctx: CanvasRenderingContext2D;
  private dctx: CanvasRenderingContext2D;
  private lastDecor = 0;
  private decorDpr = 1;
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
  private emitter = new HeaderEmitter();
  private headerEl: HTMLElement | null = null;
  private flash = 0;
  private nextFlash = 3;
  private stars: { x: number; y: number; ph: number }[] = [];
  private observer: ResizeObserver;

  /**
   * `canvas` is fixed to the window (falling particles, sky, flashes); `decor` lies in the document and
   * scrolls with it (garlands, snow caps, frost, petals at rest), so it is always exactly on the cards.
   */
  constructor(private canvas: HTMLCanvasElement, private decor: HTMLCanvasElement, private opts: EngineOptions) {
    this.ctx = canvas.getContext('2d')!;
    this.dctx = decor.getContext('2d')!;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.observer.observe(decor);
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
    this.dctx.clearRect(0, 0, this.decor.width, this.decor.height);
  }

  private resize(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.decorDpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.decor.width = Math.round(this.decor.clientWidth * this.decorDpr);
    this.decor.height = Math.round(this.decor.clientHeight * this.decorDpr);
    this.dctx.setTransform(this.decorDpr, 0, 0, this.decorDpr, 0, 0);
    this.stars = Array.from({ length: 36 }, () => ({ x: Math.random() * this.w, y: Math.random() * SKY_HEIGHT, ph: Math.random() * 6 }));
  }

  /** The floating header's rectangle in window coordinates, or null while it is not on screen. */
  private header(): HeaderRect | null {
    if (!this.headerEl || !this.headerEl.isConnected) this.headerEl = document.querySelector<HTMLElement>('[data-atmosphere-header]');
    if (!this.headerEl) return null;
    const r = this.headerEl.getBoundingClientRect();
    return r.width > 0 ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null;
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
    const base = { kind, depth: 1, variant: Math.floor(Math.random() * 4), x: Math.random() * this.w, y: anywhere ? Math.random() * this.h : -10, ph: Math.random() * 6, rot: Math.random() * 6, bounced: false };
    switch (kind) {
      case 'snow': {
        // Three planes give the scene depth: far flakes small, slow and faint, near ones large, fast and soft.
        const pick = Math.random();
        const depth = pick < 0.45 ? 0 : pick < 0.85 ? 1 : 2;
        return depth === 0
          ? { ...base, depth, vx: 0, vy: rnd(18, 32), r: rnd(0.9, 1.4) }
          : depth === 1
            ? { ...base, depth, vx: 0, vy: rnd(30, 52), r: rnd(1.6, 2.4) }
            : { ...base, depth, vx: 0, vy: rnd(70, 110), r: rnd(3.4, 5) };
      }
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

  private flake: { dark: boolean; canvas: HTMLCanvasElement } | null = null;

  /** A pre-blurred flake for the near plane: one gradient drawn once, then only scaled copies (cheap, unlike a blur filter per flake). */
  private softFlake(): HTMLCanvasElement {
    if (this.flake && this.flake.dark === this.opts.dark) return this.flake.canvas;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 48;
    const g = canvas.getContext('2d')!;
    const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    const tint = this.opts.dark ? '238,241,250' : '110,140,185';
    grad.addColorStop(0, `rgba(${tint},0.95)`);
    grad.addColorStop(0.45, `rgba(${tint},0.5)`);
    grad.addColorStop(1, `rgba(${tint},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);
    this.flake = { dark: this.opts.dark, canvas };
    return canvas;
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
    // The decor changes slowly (twinkle, growing caps): about 20 frames a second is plenty and keeps the big canvas cheap.
    if (now - this.lastDecor > 48) {
      this.lastDecor = now;
      this.drawDecor();
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    const surfaces = this.opts.getSurfaces();
    const wind = this.wind;
    const snowing = Boolean(this.layer('snow'));

    for (const p of this.particles) {
      const prev = { x: p.x, y: p.y };
      p.ph += dt;
      const sway = p.kind === 'snow' ? [8, 14, 20][p.depth]! : p.kind === 'petals' ? 26 : p.kind === 'leaves' ? 36 : p.kind === 'motes' ? 6 : 0;
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

    this.emitter.update(dt, this.opts.budget > 0 ? this.header() : null, this.layers, wind);

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
        // Near flakes only pass in front of the page; the rest settle on the card edge.
        if (p.depth < 2) growCap(this.capFor(surface), x - surface.x, p.depth === 0 ? 0.15 : 0.35);
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
        this.rests.push({ id: surface.id ?? 0, variant: p.variant, dx: x - surface.x, kind: p.kind, age: 0, life: 4 + Math.random() * 5, r: p.r, rot: p.rot });
        Object.assign(p, this.spawn(p.kind, false));
        break;
    }
  }

  private draw(): void {
    const { ctx, w, h } = this;
    const c = COLOURS[this.opts.dark ? 'dark' : 'light'];
    ctx.clearRect(0, 0, w, h);

    this.drawSky(c);

    for (const p of this.particles) {
      switch (p.kind) {
        case 'snow':
        case 'motes':
          if (p.kind === 'snow' && p.depth === 2) {
            const sprite = this.softFlake();
            ctx.globalAlpha = 0.5;
            ctx.drawImage(sprite, p.x - p.r * 1.6, p.y - p.r * 1.6, p.r * 3.2, p.r * 3.2);
            break;
          }
          ctx.globalAlpha = p.kind === 'motes' ? 0.55 : p.depth === 0 ? 0.4 : 0.9;
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
          this.drawShape(ctx, p.kind, p.x, p.y, p.r, p.rot, p.kind === 'petals' ? c.petals[p.variant % c.petals.length]! : c.leaves[p.variant % c.leaves.length]!, 0.9);
          break;
      }
    }
    ctx.globalAlpha = 1;

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

    this.drawHeaderScene(ctx, c);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${0.28 * this.flash})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  /** Everything that sits on the cards, drawn in page coordinates on the canvas that scrolls with the document. */
  private drawDecor(): void {
    const { dctx: ctx } = this;
    const c = COLOURS[this.opts.dark ? 'dark' : 'light'];
    ctx.clearRect(0, 0, this.decor.clientWidth, this.decor.clientHeight);
    const surfaces = this.opts.getSurfaces()
      .filter((s) => s.pageTop !== undefined)
      .map((s) => ({ ...s, top: s.pageTop! }));
    if (surfaces.length === 0) return;

    const byId = new Map(surfaces.map((s) => [s.id ?? 0, s]));
    for (const r of this.rests) {
      const s = byId.get(r.id);
      if (!s) continue;
      const fade = Math.min(1, (r.life - r.age) / 1);
      this.drawShape(ctx, r.kind, s.x + r.dx, s.top - r.r * 0.5, r.r, r.rot, r.kind === 'petals' ? c.petals[r.variant % c.petals.length]! : c.leaves[r.variant % c.leaves.length]!, 0.9 * fade);
    }
    for (const s of surfaces) {
      const cap = this.caps.get(s.id ?? 0);
      if (cap) this.drawCap(ctx, cap, s, c);
    }
    if (this.layer('frost')) this.drawFrost(ctx, surfaces, c.frost);
    if (this.opts.lights) this.drawLights(ctx, surfaces, c.glow);

    // The floating header lies over the page: nothing hangs behind its (translucent) body.
    const header = this.header();
    if (header) ctx.clearRect(header.left - 4, header.top + window.scrollY - 4, header.right - header.left + 8, header.bottom - header.top + 8);
  }

  private drawShape(ctx: CanvasRenderingContext2D, kind: 'petals' | 'leaves' | string, x: number, y: number, r: number, rot: number, colour: string, alpha: number): void {
    if (kind === 'petals') drawPetal(ctx, x, y, r, rot, colour, alpha);
    else drawLeaf(ctx, x, y, r, rot, colour, alpha);
  }

  /** The floating header's own weather and, at New Year, a strand of lights on its outer edges (never over its buttons). */
  private drawHeaderScene(ctx: CanvasRenderingContext2D, c: Palette): void {
    for (const p of this.emitter.active) {
      const a = HeaderEmitter.fade(p);
      switch (p.kind) {
        case 'snow':
          ctx.globalAlpha = a;
          ctx.fillStyle = c.snow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'hail':
          ctx.globalAlpha = a;
          ctx.fillStyle = c.hail;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'rain':
          ctx.globalAlpha = a;
          ctx.strokeStyle = c.rain;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - this.wind * 0.02 - 1, p.y - 9);
          ctx.stroke();
          break;
        default:
          this.drawShape(ctx, p.kind, p.x, p.y, p.r, p.rot, p.kind === 'petals' ? c.petals[p.variant % c.petals.length]! : c.leaves[p.variant % c.leaves.length]!, a * 1.6);
      }
    }
    ctx.globalAlpha = 1;
    const header = this.header();
    if (header && this.opts.lights) {
      const width = header.right - header.left - 28;
      drawStrand(ctx, header.left + 14, width, header.top - 1, 101, this.time, c.glow, this.opts.dark, -1);
      drawStrand(ctx, header.left + 14, width, header.bottom + 1, 102, this.time, c.glow, this.opts.dark, 1);
    }
  }

  private drawCap(ctx: CanvasRenderingContext2D, cap: SnowCap, s: Surface, c: Palette): void {
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

  private drawFrost(ctx: CanvasRenderingContext2D, surfaces: Surface[], colour: string): void {
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

  private drawLights(ctx: CanvasRenderingContext2D, surfaces: Surface[], glow: string): void {
    for (const s of surfaces) drawStrand(ctx, s.x, s.width, s.top, s.id ?? 0, this.time, glow, this.opts.dark, -1);
  }
}
