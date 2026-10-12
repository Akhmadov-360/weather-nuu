export type HeaderRect = { left: number; top: number; right: number; bottom: number };

export type EmitterKind = 'snow' | 'rain' | 'hail' | 'petals' | 'leaves';

export type HeaderParticle = {
  kind: EmitterKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  ph: number;
  rot: number;
  variant: number;
  age: number;
  life: number;
};

const SPEED: Record<EmitterKind, number> = { snow: 38, rain: 300, hail: 320, petals: 36, leaves: 44 };
const LIFE: Record<EmitterKind, number> = { snow: 1.9, rain: 0.32, hail: 0.3, petals: 2.1, leaves: 1.9 };
/** Particles per second at full intensity: a light fall, so the text under it stays readable. */
const RATE = 16;
const MAX = 40;

/**
 * What falls from the floating header while the page is scrolled: a short,
 * faint shower that starts on the header's lower edge and fades within about a
 * hundred pixels, so the weather does not pile up at the page margins while the
 * cards are scrolled through the middle.
 */
export class HeaderEmitter {
  private particles: HeaderParticle[] = [];
  private credit = 0;

  reset(): void {
    this.particles = [];
    this.credit = 0;
  }

  get active(): readonly HeaderParticle[] {
    return this.particles;
  }

  update(dt: number, header: HeaderRect | null, layers: { kind: string; intensity: number }[], windX: number): void {
    for (const p of this.particles) {
      p.age += dt;
      p.ph += dt;
      p.rot += dt * 1.4;
      p.x += (windX * (p.kind === 'rain' || p.kind === 'hail' ? 1.2 : 0.5) + Math.sin(p.ph * 1.6) * (p.kind === 'petals' || p.kind === 'leaves' ? 22 : 8)) * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
    if (!header) return;

    const kinds = layers.filter((l): l is { kind: EmitterKind; intensity: number } => l.kind in SPEED);
    if (kinds.length === 0) return;
    const total = kinds.reduce((sum, l) => sum + Math.min(1, l.intensity), 0);
    this.credit += dt * RATE * Math.min(1, total);
    while (this.credit >= 1 && this.particles.length < MAX) {
      this.credit -= 1;
      let pick = Math.random() * total;
      const layer = kinds.find((l) => (pick -= Math.min(1, l.intensity)) <= 0) ?? kinds[0]!;
      const kind = layer.kind;
      this.particles.push({
        kind,
        x: header.left + 16 + Math.random() * Math.max(1, header.right - header.left - 32),
        y: header.bottom - 1,
        vx: 0,
        vy: SPEED[kind] * (0.8 + Math.random() * 0.5),
        r: kind === 'snow' ? 1.2 + Math.random() * 1.6 : kind === 'hail' ? 1.5 + Math.random() : kind === 'rain' ? 1 : 3 + Math.random() * 2.5,
        ph: Math.random() * 6,
        rot: Math.random() * 6,
        variant: Math.floor(Math.random() * 4),
        age: 0,
        life: LIFE[kind] * (0.8 + Math.random() * 0.4),
      });
    }
    this.credit = Math.min(this.credit, 2);
  }

  /** 0..1 visibility for a particle: it eases in over its first 0.15 s and fades over its life. */
  static fade(p: HeaderParticle): number {
    return Math.min(1, p.age / 0.15) * (1 - p.age / p.life) * 0.5;
  }
}
