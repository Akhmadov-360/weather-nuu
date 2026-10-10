export type ResolvedTheme = 'light' | 'dark';

/** A single click flips what is shown, whatever the stored mode is. */
export function nextTheme(resolved: ResolvedTheme): ResolvedTheme {
  return resolved === 'dark' ? 'light' : 'dark';
}

/** Radius of the circle, centred on (x, y), that covers a width x height viewport. */
export function revealRadius(x: number, y: number, width: number, height: number): number {
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
}
