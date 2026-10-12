export type ConfettiPalette = 'navruz' | 'independence' | 'new_year';

const COLOURS: Record<ConfettiPalette, string[]> = {
  navruz: ['#3F7F4E', '#E9B65A', '#F4B6C8', '#FFFFFF'],
  independence: ['#1E88E5', '#FFFFFF', '#2E9E5B', '#E53935'],
  new_year: ['#FF5C5C', '#FFC857', '#5CD68A', '#5CA8FF', '#E27FD0'],
};

/** A short burst from both sides of the header. The library loads only when a burst is due, and honours reduced motion itself. */
export async function burstConfetti(palette: ConfettiPalette): Promise<void> {
  const { default: confetti } = await import('canvas-confetti');
  const colors = COLOURS[palette];
  const shared = { colors, disableForReducedMotion: true, zIndex: 45, ticks: 160, gravity: 0.9 } as const;
  void confetti({ ...shared, particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: 0.15 } });
  void confetti({ ...shared, particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.15 } });
}
