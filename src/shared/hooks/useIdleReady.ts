import { useEffect, useState } from 'react';

/**
 * False at first, true once the browser has been idle for a moment after `minDelayMs`.
 * Used to start decoration (the seasonal scene) only after the page itself has been painted
 * and has settled, so the decoration never competes with what the visitor came to see.
 */
export function useIdleReady(minDelayMs = 1200): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let idle = 0;
    const win = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const timer = window.setTimeout(() => {
      if (win.requestIdleCallback) idle = win.requestIdleCallback(() => setReady(true), { timeout: 3000 });
      else setReady(true);
    }, minDelayMs);
    return () => {
      window.clearTimeout(timer);
      if (idle && win.cancelIdleCallback) win.cancelIdleCallback(idle);
    };
  }, [minDelayMs]);
  return ready;
}
