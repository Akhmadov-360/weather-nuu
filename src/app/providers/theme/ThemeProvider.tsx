import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { flushSync } from 'react-dom';

import { nextTheme, revealRadius } from '@/shared/lib/theme/reveal';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  /** What the user picked — may be 'system', i.e. not a concrete theme. */
  mode: ThemeMode;
  /** What's actually applied right now — always a concrete theme. */
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /**
   * Flips what is shown (dark <-> light) and stores the explicit choice. With a
   * point, the new theme spreads from it as a circle (View Transitions API);
   * without the API, or with reduced motion, the change is instant.
   */
  toggle: (origin?: { x: number; y: number }) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'theme';
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

function getInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  } catch {
    // localStorage недоступен (приватный режим, SSR)
  }
  return 'system';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode !== 'system') return mode;
  try {
    return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(mode));

  useEffect(() => {
    const apply = () => {
      const next = resolveTheme(mode);
      setResolvedTheme(next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    };
    apply();

    // Only 'system' mode needs to react to the OS theme changing live —
    // an explicit light/dark pick shouldn't move when the OS does.
    if (mode !== 'system') return;
    const media = window.matchMedia(DARK_MEDIA_QUERY);
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);

  const running = useRef(false);
  const toggle = useCallback(
    (origin?: { x: number; y: number }) => {
      if (running.current) return;
      const next = nextTheme(resolvedTheme);
      const root = document.documentElement;
      const apply = () => {
        root.classList.toggle('dark', next === 'dark');
        flushSync(() => {
          setMode(next);
          setResolvedTheme(next);
        });
      };

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!document.startViewTransition || reduced) {
        apply();
        return;
      }

      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? 0;
      root.style.setProperty('--reveal-x', `${x}px`);
      root.style.setProperty('--reveal-y', `${y}px`);
      root.style.setProperty('--reveal-r', `${revealRadius(x, y, window.innerWidth, window.innerHeight)}px`);
      // Without this, colour transitions on individual elements would run inside the new snapshot.
      root.classList.add('theme-switching');
      running.current = true;
      const transition = document.startViewTransition(apply);
      void transition.finished.finally(() => {
        running.current = false;
        root.classList.remove('theme-switching');
      });
    },
    [resolvedTheme],
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode, toggle }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
