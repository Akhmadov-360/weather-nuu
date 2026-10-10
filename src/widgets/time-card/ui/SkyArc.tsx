import { useTranslation } from 'react-i18next';

import type { SkyState } from '@/shared/lib/sky';

const W = 260;
const H = 50;
const BASE = 42; // horizon line
const RISE = 32; // height of the arc above the horizon
const MARGIN = 8;

const point = (p: number): [number, number] => [MARGIN + p * (W - 2 * MARGIN), BASE - Math.sin(Math.PI * p) * RISE];

function arcPath(from: number, to: number): string {
  const steps = Math.max(2, Math.round((to - from) * 60));
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const [x, y] = point(from + ((to - from) * i) / steps);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d.trim();
}

/** The lit part of the moon: `phase` 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
function moonLitPath(cx: number, cy: number, r: number, phase: number): string {
  const k = Math.cos(2 * Math.PI * phase);
  const rx = Math.max(0.01, r * Math.abs(k));
  const waxing = phase < 0.5;
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = waxing ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0;
  return `M${cx} ${cy - r} A${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} A${rx} ${r} 0 0 ${innerSweep} ${cx} ${cy - r} Z`;
}

function Luminary({ sky }: { sky: SkyState }): React.JSX.Element {
  const [x, y] = point(sky.progress);
  if (sky.luminary === 'sun') {
    return (
      <g>
        <circle cx={x} cy={y} r={14} fill="var(--sand)" opacity={0.22} />
        <circle cx={x} cy={y} r={6.5} fill="var(--sand)" />
      </g>
    );
  }
  return (
    <g>
      <circle cx={x} cy={y} r={7} fill="var(--text-secondary)" opacity={0.28} />
      <path d={moonLitPath(x, y, 7, sky.moonPhase)} fill="var(--text-primary)" opacity={0.9} />
    </g>
  );
}

type SkyArcProps = {
  sky: SkyState;
  /** Formats a moment (ms) on the station's clock. */
  formatTime: (ms: number) => string;
};

/**
 * Arc of the body that is up: dashed track, travelled part solid, the sun (or the moon at night) on it.
 * Under it the arc's ends: sunrise and sunset by day, sunset and the next sunrise by night.
 */
export function SkyArc({ sky, formatTime }: SkyArcProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" aria-hidden>
        <line x1={0} y1={BASE} x2={W} y2={BASE} stroke="var(--glass-border)" strokeWidth={1} />
        <path d={arcPath(0, 1)} fill="none" stroke="var(--sand)" strokeWidth={1.5} strokeDasharray="3 5" opacity={0.7} />
        {sky.progress > 0.005 ? (
          <path d={arcPath(0, sky.progress)} fill="none" stroke="var(--sand)" strokeWidth={2.4} strokeLinecap="round" />
        ) : null}
        <Luminary sky={sky} />
      </svg>
      <div className="-mt-1 flex justify-between text-xs text-muted-themed">
        <span>
          {t(sky.luminary === 'sun' ? 'sunrise' : 'sunset')} {formatTime(sky.arcStart)}
        </span>
        <span>
          {t(sky.luminary === 'sun' ? 'sunset' : 'sunrise')} {formatTime(sky.arcEnd)}
        </span>
      </div>
    </div>
  );
}
