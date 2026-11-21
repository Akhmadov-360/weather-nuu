import { useEffect, useState } from 'react';
import { isKeyboardOpen } from './keyboard';

/** True while an on-screen keyboard covers the lower part of the page (read from the visual viewport). */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setOpen(isKeyboardOpen(viewport.height, window.innerHeight));
    update();
    viewport.addEventListener('resize', update);
    return () => viewport.removeEventListener('resize', update);
  }, []);
  return open;
}
