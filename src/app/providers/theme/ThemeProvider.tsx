import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  /** What the user picked — may be 'system', i.e. not a concrete theme. */
  mode: ThemeMode;
  /** What's actually applied right now — always a concrete theme. */
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
