import { useEffect, useRef } from 'react';

type Mote = { x: number; y: number; r: number; v: number; ph: number };

/**
 * Ember sparks rising for the combustible-gas card, bubbles for the alcohol
 * one. Decorative: no pointer events, hidden from assistive tech, still when
 * the user prefers reduced motion or the tab is hidden.
 */
export function GasMotes({ kind, count, color }: { kind: 'ember' | 'bubble'; count: number; color: string }): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let w = 0;
    let h = 0;
    let frame = 0;
    let last = performance.now();
    const motes: Mote[] = [];
    const spawn = (anywhere: boolean): Mote => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 6,
      r: kind === 'ember' ? 0.8 + Math.random() * 1.6 : 2 + Math.random() * 3,
      v: kind === 'ember' ? 14 + Math.random() * 22 : 8 + Math.random() * 14,
      ph: Math.random() * 6,
    });
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      while (motes.length < count) motes.push(spawn(true));
      motes.length = Math.min(motes.length, count);
      for (const m of motes) {
        m.ph += dt;
        m.y -= m.v * dt;
        m.x += Math.sin(m.ph * 1.6) * (kind === 'ember' ? 10 : 5) * dt;
        if (m.y < -8) Object.assign(m, spawn(false));
        const life = Math.max(0, Math.min(1, m.y / h));
        ctx.globalAlpha = kind === 'ember' ? 0.15 + 0.6 * life * (0.7 + 0.3 * Math.sin(m.ph * 9)) : 0.5 * life;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * (kind === 'ember' ? 0.5 + life * 0.5 : 1), 0, Math.PI * 2);
        if (kind === 'ember') {
          ctx.fillStyle = color;
          ctx.fill();
        } else {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
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
    if (!document.hidden) frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [kind, count, color]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}
