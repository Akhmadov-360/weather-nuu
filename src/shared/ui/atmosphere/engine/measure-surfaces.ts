import type { Surface } from './surfaces';

/** The straight part of a card's top edge: the rounded corners are left out so snow does not sit on thin air. */
const CORNER_INSET = 14;

type Measured = { id: number; x: number; width: number; pageTop: number; pageBottom: number };

/** Card edges in page coordinates (independent of the scroll position), relative to the top of the document. */
export function measureSurfaces(): Measured[] {
  const out: Measured[] = [];
  const scrollY = window.scrollY;
  document.querySelectorAll<HTMLElement>('[data-atmosphere-surface]').forEach((el, id) => {
    const rect = el.getBoundingClientRect();
    if (rect.width < CORNER_INSET * 4) return;
    out.push({ id, x: rect.left + CORNER_INSET, width: rect.width - CORNER_INSET * 2, pageTop: rect.top + scrollY, pageBottom: rect.bottom + scrollY });
  });
  return out;
}

/**
 * Keeps the card edges current. They are stored in page coordinates, so scrolling
 * does not change them: the tracker re-measures only when the layout can have
 * changed (resize, a card appearing or growing, checked twice a second), and
 * `get()` converts to window coordinates with the live scroll position, which
 * keeps falling particles exact. The decor canvas lives in the document and
 * scrolls natively with the cards, so garlands and snow caps cannot lag.
 */
export function trackSurfaces(): { get(): Surface[]; dispose(): void } {
  let measured = measureSurfaces();
  let queued = 0;
  const refresh = () => {
    queued = 0;
    measured = measureSurfaces();
  };
  const schedule = () => {
    if (!queued) queued = requestAnimationFrame(refresh);
  };
  window.addEventListener('resize', schedule);
  const timer = window.setInterval(schedule, 500);
  return {
    get: () => {
      const scrollY = window.scrollY;
      return measured.map((m) => ({
        id: m.id,
        x: m.x,
        width: m.width,
        top: m.pageTop - scrollY,
        bottom: m.pageBottom - scrollY,
        pageTop: m.pageTop,
        pageBottom: m.pageBottom,
      }));
    },
    dispose() {
      cancelAnimationFrame(queued);
      window.clearInterval(timer);
      window.removeEventListener('resize', schedule);
    },
  };
}
