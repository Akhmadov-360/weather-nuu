import { Wind } from 'lucide-react';
import type { OrbTone } from '../model/orb-tone';

/** Three colours of the slow swirl, per tone. Green and teal for clean air, amber for raised, orange and rose for bad. */
const SWIRL: Record<OrbTone, [string, string, string]> = {
  good: ['#10B981', '#2DD4BF', '#38BDF8'],
  idle: ['#10B981', '#2DD4BF', '#38BDF8'],
  warn: ['#F59E0B', '#FBBF24', '#F97316'],
  bad: ['#F97316', '#F43F5E', '#FB7185'],
};

type AirOrbProps = {
  /** Side in pixels. 28 for the corner button and the header, bigger on the start screen. */
  size?: number;
  tone?: OrbTone;
  className?: string;
};

/**
 * The assistant's mark: a small round badge with a soft, slowly swirling gradient in the colour of the air
 * outside the card (green-teal when clean, amber when raised) and a thin white wind glyph. The swirl is a
 * rotating layer (a transform, cheap for the GPU) and stands still for those who asked for less motion.
 */
export function AirOrb({ size = 28, tone = 'idle', className }: AirOrbProps): React.JSX.Element {
  const [a, b, c] = SWIRL[tone];
  return (
    <span
      aria-hidden="true"
      data-tone={tone}
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full ${className ?? ''}`}
      style={{ width: size, height: size, boxShadow: `0 0 ${Math.round(size * 0.55)}px ${a}55, inset 0 0 0 1px rgba(255,255,255,0.22)` }}
    >
      <span
        className="absolute -inset-1/4 will-change-transform motion-safe:animate-[spin_11s_linear_infinite]"
        style={{ background: `conic-gradient(from 0deg, ${a}, ${b}, ${c}, ${a})` }}
      />
      <span className="absolute inset-0 [background:radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.5),transparent_55%)]" />
      <Wind className="relative text-white drop-shadow-sm" width={size * 0.56} height={size * 0.56} strokeWidth={1.6} />
    </span>
  );
}
