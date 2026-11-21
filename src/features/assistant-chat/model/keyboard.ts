/** The visible area is under three quarters of the window: an on-screen keyboard has opened. */
export function isKeyboardOpen(visualViewportHeight: number, windowHeight: number): boolean {
  if (!(visualViewportHeight > 0) || !(windowHeight > 0)) return false;
  return visualViewportHeight < windowHeight * 0.75;
}
