import type { Surface } from './surfaces';

/** The straight part of a card's top edge: the rounded corners are left out so snow does not sit on thin air. */
const CORNER_INSET = 14;

export function measureSurfaces(): Surface[] {
  const out: Surface[] = [];
  document.querySelectorAll<HTMLElement>('[data-atmosphere-surface]').forEach((el, id) => {
    const rect = el.getBoundingClientRect();
    if (rect.width < CORNER_INSET * 4 || rect.bottom < 0 || rect.top > window.innerHeight) return;
    out.push({ id, x: rect.left + CORNER_INSET, width: rect.width - CORNER_INSET * 2, top: rect.top, bottom: rect.bottom });
  });
  return out;
}

/**
 * Keeps the list of card edges current: re-measured when the page scrolls or
 * resizes (at most once a frame) and twice a second, which catches cards that
 * appear after the data loads or move when the layout reflows.
 */
export function trackSurfaces(): { get(): Surface[]; dispose(): void } {
  let surfaces = measureSurfaces();
  let queued = 0;
  const refresh = () => {
    queued = 0;
    surfaces = measureSurfaces();
  };
  const schedule = () => {
    if (!queued) queued = requestAnimationFrame(refresh);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  const timer = window.setInterval(schedule, 500);
  return {
    get: () => surfaces,
    dispose() {
      cancelAnimationFrame(queued);
      window.clearInterval(timer);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    },
  };
}
