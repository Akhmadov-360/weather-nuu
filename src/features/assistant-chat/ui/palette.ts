import type { CSSProperties } from 'react';
import { useTheme } from '@/shared/hooks/useTheme';

export type AssistantTheme = 'dark' | 'light';

/**
 * The colours of the assistant panel, per theme. Dark is a night sky; light is a pale sky with the same
 * structure. Text on every surface keeps 4.5:1 (the test checks it).
 */
export const PALETTE = {
  dark: {
    bg: '#0B1020',
    surface: '#131A33',
    surfaceHover: '#1B2547',
    ink: '#E8ECF8',
    muted: '#8E99B8',
    accent: '#8FB0DE',
    star: '#8E99B8',
    border: 'rgba(255,255,255,0.10)',
  },
  light: {
    bg: '#F5F7FC',
    surface: '#FFFFFF',
    surfaceHover: '#EAF0FB',
    ink: '#172033',
    muted: '#566380',
    accent: '#2F5FA8',
    star: '#7F90B8',
    border: 'rgba(23,32,51,0.12)',
  },
} as const;

/** The palette as CSS variables (`--ai-bg`, `--ai-ink`, ...) for the panel and everything inside it. */
export function paletteStyle(theme: AssistantTheme): CSSProperties {
  const p = PALETTE[theme];
  return {
    '--ai-bg': p.bg,
    '--ai-surface': p.surface,
    '--ai-surface-hover': p.surfaceHover,
    '--ai-ink': p.ink,
    '--ai-muted': p.muted,
    '--ai-accent': p.accent,
    '--ai-star': p.star,
    '--ai-border': p.border,
  } as CSSProperties;
}

/** The theme the page shows now (not the saved choice, which may be "system"). */
export function useAssistantTheme(): AssistantTheme {
  return useTheme().resolvedTheme === 'light' ? 'light' : 'dark';
}
