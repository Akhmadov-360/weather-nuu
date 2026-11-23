// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HOVER_QUERY, InfoHint } from './info-hint';

/** A browser with or without a mouse: the media query of the hint matches or not. */
function setPointer(fine: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: fine && query === HOVER_QUERY,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  // Radix measures what it shows; jsdom has no layout.
  globalThis.ResizeObserver ??= class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
  window.HTMLElement.prototype.scrollIntoView ??= vi.fn();
});
afterEach(() => cleanup());

describe('InfoHint', () => {
  it('is a button with a name for a screen reader, closed until it is asked', () => {
    setPointer(false);
    render(<InfoHint label="About these data">The notes</InfoHint>);
    const button = screen.getByRole('button', { name: 'About these data' });
    expect(button).toBeTruthy();
    expect(screen.queryByText('The notes')).toBeNull();
  });

  it('has a hit area of 44 px around an icon of 16 px, without taking space in the layout', () => {
    setPointer(false);
    render(<InfoHint label="About">x</InfoHint>);
    const classes = screen.getByRole('button', { name: 'About' }).className;
    expect(classes).toContain('size-11');
    expect(classes).toMatch(/-mt-3\.5/);
    expect(classes).toMatch(/-mr-3\.5/);
    expect(screen.getByRole('button', { name: 'About' }).querySelector('svg')?.getAttribute('class')).toContain('size-4');
  });

  it('opens a popover on a tap where there is no mouse (a phone, a touch screen)', async () => {
    setPointer(false);
    render(<InfoHint label="About">The notes of the card</InfoHint>);
    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    await waitFor(() => expect(screen.getByText('The notes of the card')).toBeTruthy());
    expect(document.querySelector('[data-slot="popover-content"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();
  });

  it('opens a tooltip with the keyboard focus or the mouse where there is a mouse on a wide screen', async () => {
    setPointer(true);
    // The provider of the tooltips is at the root of the application.
    render(
      <TooltipProvider>
        <InfoHint label="About">The notes of the card</InfoHint>
      </TooltipProvider>,
    );
    const button = screen.getByRole('button', { name: 'About' });
    fireEvent.focus(button);
    fireEvent.pointerMove(button);
    await waitFor(() => expect(screen.getAllByText('The notes of the card').length).toBeGreaterThan(0));
    expect(document.querySelector('[data-slot="tooltip-content"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="popover-content"]')).toBeNull();
  });

  it('asks for a mouse and a wide screen by one query', () => {
    expect(HOVER_QUERY).toBe('(min-width: 640px) and (hover: hover) and (pointer: fine)');
  });
});
