import { useEffect, useRef, useState } from 'react';

type AnimateNumberProps = {
  value: number;
  duration?: number;
  fractionDigits?: number;
  /**
   * Минимальное изменение для запуска анимации.
   * Малые шумовые колебания (напр. 23.4 → 23.5) не анимируются —
   * это снижает нагрузку на RAF при частом polling.
   */
  threshold?: number;
};

export function AnimateNumber({
  value,
  duration = 450,
  fractionDigits = 1,
  threshold = 0.5,
}: AnimateNumberProps): React.JSX.Element {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef  = useRef(0);

  useEffect(() => {
    const diff = Math.abs(value - prevRef.current);

    // Изменение меньше порога — обновляем без анимации
    if (diff < threshold) {
      cancelAnimationFrame(rafRef.current);
      setDisplay(value);
      prevRef.current = value;
      return;
    }

    const start     = prevRef.current;
    const end       = value;
    const startTime = performance.now();

    const tick = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setDisplay(start + (end - start) * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, threshold]);

  return <>{display.toFixed(fractionDigits)}</>;
}
