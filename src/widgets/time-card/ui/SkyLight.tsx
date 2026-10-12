import { useReducedMotion } from 'framer-motion';

import { LightRays } from '@/components/ui/light-rays';
import { useTheme } from '@/shared/hooks/useTheme';
import type { DayPhase } from '@/shared/lib/sky';

type RaySpec = { color: string; count: number; length: string; blur: number; speed: number };

/** The light of each part of the day: warm and low at dawn and dusk, golden in the morning, pale and high at noon. */
const RAYS: Record<DayPhase, RaySpec | null> = {
  night: null,
  dawn: { color: 'rgba(255,170,120,0.34)', count: 5, length: '85%', blur: 26, speed: 18 },
  morning: { color: 'rgba(255,205,110,0.42)', count: 7, length: '95%', blur: 30, speed: 14 },
  day: { color: 'rgba(255,238,185,0.32)', count: 5, length: '90%', blur: 38, speed: 22 },
  evening: { color: 'rgba(255,150,80,0.4)', count: 5, length: '85%', blur: 30, speed: 18 },
  dusk: { color: 'rgba(170,140,255,0.26)', count: 3, length: '70%', blur: 34, speed: 24 },
};

/** How many stars show: all at night, a few at the edges of the night. */
const STARS: Record<DayPhase, number> = { night: 1, dawn: 0.35, morning: 0, day: 0, evening: 0, dusk: 0.5 };

type Star = { left: number; top: number; size: number; delay: number; duration: number };

/** A fixed scatter (the same on every render and every visit), from a small seeded generator. */
const STAR_FIELD: Star[] = (() => {
  let seed = 20261012;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 34 }, () => ({
    left: rnd() * 100,
    top: rnd() * 62,
    size: rnd() < 0.2 ? 2 : 1.2,
    delay: rnd() * 5,
    duration: 2.4 + rnd() * 3.2,
  }));
})();

/**
 * Light and stars for the time card's sky, by the phase of the day. Rays glow
 * (screen blending) on the dark theme and sit as a warm wash on the light one;
 * stars twinkle only if the user allows motion.
 */
export function SkyLight({ phase }: { phase: DayPhase | null }): React.JSX.Element | null {
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  if (!phase) return null;
  const dark = resolvedTheme === 'dark';
  const rays = RAYS[phase];
  const starShare = STARS[phase];
  const stars = STAR_FIELD.slice(0, Math.round(STAR_FIELD.length * starShare));

  return (
    <div key={phase} className="sky-fade-in pointer-events-none absolute inset-0" aria-hidden>
      {rays && !reduceMotion ? (
        <LightRays
          color={rays.color}
          count={rays.count}
          length={rays.length}
          blur={rays.blur}
          speed={rays.speed}
          style={{ ['--light-rays-blend' as string]: dark ? 'screen' : 'normal', opacity: dark ? 1 : 0.75 }}
        />
      ) : null}
      {stars.map((star, i) => (
        <span
          key={i}
          className={reduceMotion ? 'absolute rounded-full' : 'star-twinkle absolute rounded-full'}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            background: dark ? '#FFFFFF' : '#4B56A8',
            opacity: reduceMotion ? 0.55 : undefined,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
