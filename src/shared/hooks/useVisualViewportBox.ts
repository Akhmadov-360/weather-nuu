import { useEffect, useState } from 'react';

export type ViewportBox = { top: number; height: number };

/**
 * The part of the page that the visitor can see, from the visual viewport: the window minus the on-screen keyboard and
 * the bars of the browser, and where its top edge is. A sheet fixed to the layout viewport (`bottom: 0`) ends up under the
 * keyboard on an iPhone, or is left with a gap below it when the keyboard goes; a sheet that takes this box always fits
 * what is on the screen. `null` where the browser has no visual viewport (the sheet then takes the dynamic viewport height).
 */
export function readViewportBox(viewport: Pick<VisualViewport, 'height' | 'offsetTop'> | null | undefined): ViewportBox | null {
  if (!viewport || !(viewport.height > 0)) return null;
  return { top: Math.max(0, Math.round(viewport.offsetTop)), height: Math.round(viewport.height) };
}

export function useVisualViewportBox(enabled: boolean): ViewportBox | null {
  const [box, setBox] = useState<ViewportBox | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!enabled || !viewport) {
      setBox(null);
      return;
    }
    const update = () => setBox((previous) => {
      const next = readViewportBox(viewport);
      return previous && next && previous.top === next.top && previous.height === next.height ? previous : next;
    });
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [enabled]);
  return box;
}
