import { animate, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';

/**
 * The "switch section" icon: two arrows that move apart and come back each
 * time `burst` changes (the link was clicked). Static with reduced motion.
 * Same geometry as lucide's ArrowLeftRight, split into its two arrows.
 */
export function SwapArrows({ burst }: { burst: number }): React.JSX.Element {
  const top = useRef<SVGGElement>(null);
  const bottom = useRef<SVGGElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (burst === 0 || reduceMotion || !top.current || !bottom.current) return;
    const options = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };
    const a = animate(top.current, { x: [0, -5, 0] }, options);
    const b = animate(bottom.current, { x: [0, 5, 0] }, options);
    return () => {
      a.stop();
      b.stop();
    };
  }, [burst, reduceMotion]);

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 overflow-visible opacity-70"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <g ref={top}>
        <path d="M8 3 4 7l4 4" />
        <path d="M4 7h16" />
      </g>
      <g ref={bottom}>
        <path d="m16 21 4-4-4-4" />
        <path d="M20 17H4" />
      </g>
    </svg>
  );
}
