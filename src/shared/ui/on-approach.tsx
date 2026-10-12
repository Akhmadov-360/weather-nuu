import { useEffect, useRef, useState } from 'react';

/**
 * Renders `fallback` until the placeholder is within `margin` of the viewport, then `children`.
 * Used for heavy blocks below the first screen (the charts), so their code and work do not
 * compete with what the visitor sees first. Without IntersectionObserver the children render at once.
 */
export function OnApproach({
  children,
  fallback,
  margin = '600px',
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
  margin?: string;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    if (near || !el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near, margin]);

  return <div ref={ref}>{near ? children : fallback}</div>;
}
