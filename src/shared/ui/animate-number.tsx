import { useEffect, useRef, useState } from "react";

type AnimateNumberProps = {
  value: number;
  duration?: number;
  fractionDigits?: number;
};

export function AnimateNumber({ value, duration = 450, fractionDigits = 1 }: AnimateNumberProps): React.JSX.Element {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const startTime = performance.now();

    let raf = 0;

    const tick = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplay(current);

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display.toFixed(fractionDigits)}</>;
}
