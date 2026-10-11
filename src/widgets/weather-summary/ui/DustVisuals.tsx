import { useEffect, useMemo, useRef } from 'react';

import { GlyphMatrix } from '@/components/ui/glyph-matrix';
import { Particles } from '@/components/ui/particles';
import { dustParticleCounts } from '../model/dust-particles';
import { useCssColor } from '../model/use-css-color';

/** Fades a layer out towards the text column so the numbers stay readable. */
const FADE_LEFT = '[mask-image:linear-gradient(to_right,transparent_8%,#000_55%)] sm:[mask-image:linear-gradient(to_right,transparent_28%,#000_62%)]';

function usePrefersReducedMotion(): boolean {
  return useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
}

/**
 * Live dust: fine particles are PM2.5, larger ones PM10, the colour is the AQI
 * category and the count follows the readings. Particles lean towards the
 * cursor a little, which is the library's own behaviour.
 */
export function DustField({ pm25, pm10, colorVar }: { pm25: number; pm10: number | null; colorVar: string }): React.JSX.Element | null {
  const color = useCssColor(colorVar, '#22c55e');
  const reduced = usePrefersReducedMotion();
  const counts = dustParticleCounts(pm25, pm10);
  if (reduced) return null;
  return (
    <div className={`pointer-events-none absolute inset-0 ${FADE_LEFT}`} aria-hidden>
      <Particles key={`fine-${counts.fine}`} className="absolute inset-0" quantity={counts.fine} size={0.8} color={color} vx={-0.12} staticity={60} ease={60} />
      <Particles key={`coarse-${counts.coarse}`} className="absolute inset-0" quantity={counts.coarse} size={2.2} color={color} vx={-0.06} staticity={90} ease={90} />
    </div>
  );
}

/** Dust that has stopped moving: a drift along the bottom edge, denser in the middle. Drawn once. */
export function SettledDust(): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  const color = useCssColor('--text-muted', '#8E96C0');

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const paint = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = color;
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const count = Math.round(w * 0.9);
      for (let i = 0; i < count; i++) {
        const x = rnd() * w;
        const bump = Math.exp(-(((x / w) - 0.45) ** 2) / 0.09);
        const lift = Math.pow(rnd(), 2.4) * h * 0.42 * bump;
        ctx.globalAlpha = 0.12 + rnd() * 0.5 * (1 - lift / (h * 0.45));
        ctx.beginPath();
        ctx.arc(x, h - 3 - lift, 0.5 + rnd() * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [color]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}

/** A sensor lens that has gone quiet: rings and ticks, a flat line through the middle. */
export function SilentLens({ className }: { className?: string }): React.JSX.Element {
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <svg className={className} viewBox="0 0 220 220" aria-hidden fill="none">
      <circle cx="110" cy="110" r="100" stroke="var(--text-muted)" strokeOpacity=".35" />
      <circle cx="110" cy="110" r="66" stroke="var(--text-muted)" strokeOpacity=".5" />
      {ticks.map((i) => {
        const a = (i / 60) * Math.PI * 2;
        const long = i % 5 === 0;
        const r1 = 88;
        const r2 = long ? 80 : 84;
        return (
          <line
            key={i}
            x1={110 + r1 * Math.cos(a)}
            y1={110 + r1 * Math.sin(a)}
            x2={110 + r2 * Math.cos(a)}
            y2={110 + r2 * Math.sin(a)}
            stroke="var(--text-muted)"
            strokeOpacity={long ? 0.7 : 0.4}
          />
        );
      })}
      <circle cx="110" cy="110" r="22" stroke="var(--text-secondary)" strokeWidth="2" />
      <line x1="100" x2="120" y1="110" y2="110" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M0 110 H70 M150 110 H220" stroke="var(--text-muted)" strokeOpacity=".5" strokeDasharray="2 5" />
    </svg>
  );
}

/** Station without a dust sensor: a matrix of drifting glyphs and an empty mount with a crossed-out sensor. */
export function NoSensorArt(): React.JSX.Element {
  const color = useCssColor('--text-muted', '#8E96C0');
  return (
    <>
      <div className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_right,transparent_30%,#000_70%)]" aria-hidden>
        <GlyphMatrix glyphs="·•∙°+" cellSize={14} mutationRate={0.03} interval={120} fadeBottom={0.5} color={color} />
      </div>
      <svg className="pointer-events-none absolute right-24 top-1/2 hidden h-44 w-72 -translate-y-1/2 sm:block" viewBox="0 0 288 176" aria-hidden fill="none" stroke="var(--status-info)" strokeWidth="2" strokeLinejoin="round">
        <path d="M20 80 C20 66 40 60 60 60 H228 C250 60 268 68 268 82 V112 C268 128 250 136 228 136 H196 C176 136 170 146 150 146 H60 C36 146 20 134 20 118Z" strokeOpacity=".85" />
        <path d="M20 80 C20 94 40 100 60 100 H150 C172 100 178 112 198 112 H228 C250 112 268 104 268 82" strokeOpacity=".5" strokeDasharray="6 6" />
        <circle cx="144" cy="40" r="24" />
        <path d="M130 54 L158 26" strokeWidth="3" strokeLinecap="round" />
        <path d="M136 36 a8 8 0 0 1 16 0 c0 5 -8 5 -8 11" strokeOpacity=".8" />
      </svg>
    </>
  );
}
