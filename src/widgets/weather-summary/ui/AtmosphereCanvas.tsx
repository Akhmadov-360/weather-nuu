import { useEffect, useRef } from 'react';

import type { AtmosphereKind } from '../model/atmosphere';

const MAX_PARTICLES = 46;
const MAX_DPR = 2;

type Particle = { x: number; y: number; r: number; v: number; phase: number };

const counts: Record<AtmosphereKind, number> = { snow: MAX_PARTICLES, heat: 0, calm: 14 };

function fill(kind: AtmosphereKind, theme: 'light' | 'dark'): string {
  if (kind === 'snow') return theme === 'dark' ? 'rgba(238, 241, 250, 0.85)' : 'rgba(110, 140, 185, 0.55)';
  return theme === 'dark' ? 'rgba(212, 191, 160, 0.35)' : 'rgba(190, 165, 135, 0.5)';
}

/**
 * Background weather for a card: snow, a heat shimmer or a few drifting motes.
 * Decoration only (hidden from assistive tech, never receives pointer events).
 * Nothing runs when the user asks for reduced motion or the tab is hidden, and
 * the particle count is capped so a slow machine is not punished.
 */
export function AtmosphereCanvas({ kind, theme }: { kind: AtmosphereKind; theme: 'light' | 'dark' }): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;

    let width = 0;
    let height = 0;
    const particles: Particle[] = [];
    let frame = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const spawn = (snow: boolean): Particle => ({
      x: Math.random() * width,
      y: snow ? -4 : Math.random() * height,
      r: snow ? 1 + Math.random() * 2.2 : 1 + Math.random() * 1.4,
      v: snow ? 18 + Math.random() * 26 : 2 + Math.random() * 4,
      phase: Math.random() * 6,
    });

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, width, height);

      const snow = kind === 'snow';
      while (particles.length < counts[kind]) particles.push(spawn(snow));
      particles.length = Math.min(particles.length, counts[kind]);

      ctx.fillStyle = fill(kind, theme);
      for (const p of particles) {
        p.phase += dt;
        if (snow) {
          p.y += p.v * dt;
          p.x += Math.sin(p.phase * 1.3) * 8 * dt;
          if (p.y > height + 4) Object.assign(p, spawn(true));
        } else {
          p.y -= p.v * dt;
          p.x += Math.sin(p.phase) * 5 * dt;
          if (p.y < -4) {
            p.y = height + 4;
            p.x = Math.random() * width;
          }
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (kind === 'heat') {
        ctx.strokeStyle = theme === 'dark' ? 'rgba(242, 134, 107, 0.2)' : 'rgba(217, 115, 26, 0.16)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
          const y0 = height * 0.3 + i * 14;
          ctx.beginPath();
          for (let x = 0; x <= width; x += 6) {
            const y = y0 + Math.sin(x / 22 + now / 500 + i) * 3.5;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      frame = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onMotionChange = () => {
      if (reduced.matches) {
        cancelAnimationFrame(frame);
        ctx.clearRect(0, 0, width, height);
      }
    };
    reduced.addEventListener('change', onMotionChange);

    if (!document.hidden) frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', onMotionChange);
    };
  }, [kind, theme]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}
