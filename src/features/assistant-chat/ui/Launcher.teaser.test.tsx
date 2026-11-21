// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/app/providers/i18n/i18n';

const status = vi.hoisted(() => ({ value: { data: { enabled: true } as { enabled: boolean } | undefined, isError: false } }));

vi.mock('@animate-ui/react/icons', () => ({ AnimateIcon: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/animate-ui/icons/bot-message-square', () => ({ BotMessageSquare: () => <svg /> }));
vi.mock('../api/assistant-status', () => ({ useAssistantStatus: () => status.value }));
vi.mock('./AssistantPanel', () => ({ AssistantPanel: () => <div data-testid="panel" /> }));

import Launcher, { TEASER_DELAY_MS, TEASER_HOLD_MS, TEASER_SEEN_KEY } from './Launcher';

const button = () => screen.getByRole('button', { name: 'Открыть помощника' });

function stubMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => false,
  }));
}

function mount() {
  return render(
    <MemoryRouter initialEntries={['/room']}>
      <Launcher />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  stubMotion(false);
  sessionStorage.clear();
  status.value = { data: { enabled: true }, isError: false };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the greeting of the launcher button', () => {
  it('is closed at first, slides out with "Ask the smart assistant" after a moment, and slides back into the icon', () => {
    mount();
    expect(button().getAttribute('data-teaser')).toBe('closed');
    act(() => void vi.advanceTimersByTime(TEASER_DELAY_MS + 10));
    expect(button().getAttribute('data-teaser')).toBe('open');
    expect(screen.getByText('Спросите умного помощника')).toBeTruthy();
    act(() => void vi.advanceTimersByTime(TEASER_HOLD_MS + 10));
    expect(button().getAttribute('data-teaser')).toBe('closed');
  });

  it('does not change the name of the button for a screen reader: the text is only a hint', () => {
    mount();
    act(() => void vi.advanceTimersByTime(TEASER_DELAY_MS + 10));
    expect(screen.getByText('Спросите умного помощника').closest('[aria-hidden="true"]')).not.toBeNull();
    expect(button()).toBeTruthy();
  });

  it('shows once per visit: not again after a reload within the same session', () => {
    mount();
    act(() => void vi.advanceTimersByTime(TEASER_DELAY_MS + TEASER_HOLD_MS + 20));
    cleanup();
    mount();
    act(() => void vi.advanceTimersByTime(TEASER_DELAY_MS + 10));
    expect(button().getAttribute('data-teaser')).toBe('closed');
    expect(sessionStorage.getItem(TEASER_SEEN_KEY)).toBe('1');
  });

  it('is not shown to someone who asked for less motion', () => {
    stubMotion(true);
    mount();
    act(() => void vi.advanceTimersByTime(TEASER_DELAY_MS + 10));
    expect(button().getAttribute('data-teaser')).toBe('closed');
  });

  it('is not shown while it is not known that the assistant is on', () => {
    status.value = { data: undefined, isError: false };
    mount();
    act(() => void vi.advanceTimersByTime(TEASER_DELAY_MS + 10));
    expect(screen.queryByText('Спросите умного помощника')).toBeNull();
  });

  it('goes away at once when the button is pressed, and is not shown again', () => {
    mount();
    act(() => void vi.advanceTimersByTime(TEASER_DELAY_MS + 10));
    fireEvent.click(button());
    expect(button().getAttribute('data-teaser')).toBe('closed');
    expect(sessionStorage.getItem(TEASER_SEEN_KEY)).toBe('1');
  });

  it('still works when the browser does not let the page keep a note (private mode)', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    mount();
    act(() => void vi.advanceTimersByTime(TEASER_DELAY_MS + 10));
    expect(button().getAttribute('data-teaser')).toBe('open');
  });
});
