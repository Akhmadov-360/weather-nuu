// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/app/providers/i18n/i18n';

const status = vi.hoisted(() => ({ value: { data: undefined as { enabled: boolean } | undefined, isError: false } }));

// The animated icon needs browser features jsdom lacks; its animation is not what is tested here.
vi.mock('@animate-ui/react/icons', () => ({ AnimateIcon: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('./use-air-tone', () => ({ useAirTone: () => 'good' }));
vi.mock('../api/assistant-status', () => ({ useAssistantStatus: () => status.value }));
vi.mock('./AssistantPanel', () => ({
  AssistantPanel: ({ context, open }: { context: string; open: boolean }) => <div data-testid="panel" data-context={context} data-open={String(open)} />,
}));

import Launcher from './Launcher';

function mount(path = '/room') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Launcher />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  status.value = { data: undefined, isError: false };
  // The button asks the browser about reduced motion; jsdom has no matchMedia.
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, onchange: null, dispatchEvent: () => false }));
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Launcher', () => {
  it('shows nothing while it is not known whether the assistant is on', () => {
    mount();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows nothing when the assistant is off', () => {
    status.value = { data: { enabled: false }, isError: false };
    mount();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows nothing, and does not break the page, when the status could not be read', () => {
    status.value = { data: undefined, isError: true };
    mount();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows a button when the assistant is on, and does not load the panel until it is pressed', () => {
    status.value = { data: { enabled: true }, isError: false };
    mount();
    expect(screen.getByRole('button', { name: 'Открыть помощника' })).toBeTruthy();
    expect(screen.queryByTestId('panel')).toBeNull();
  });

  it('opens the panel for the room page', async () => {
    status.value = { data: { enabled: true }, isError: false };
    mount('/room');
    fireEvent.click(screen.getByRole('button', { name: 'Открыть помощника' }));
    const panel = await screen.findByTestId('panel');
    expect(panel.getAttribute('data-context')).toBe('room');
    expect(panel.getAttribute('data-open')).toBe('true');
  });

  it('opens the panel for the street page when asked from there', async () => {
    status.value = { data: { enabled: true }, isError: false };
    mount('/street');
    fireEvent.click(screen.getByRole('button', { name: 'Открыть помощника' }));
    expect((await screen.findByTestId('panel')).getAttribute('data-context')).toBe('street');
  });

  it('asks as the room on pages that are neither the room nor the street', async () => {
    status.value = { data: { enabled: true }, isError: false };
    mount('/map');
    fireEvent.click(screen.getByRole('button', { name: 'Открыть помощника' }));
    expect((await screen.findByTestId('panel')).getAttribute('data-context')).toBe('room');
  });
});
