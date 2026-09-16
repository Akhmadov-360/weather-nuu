import { Toaster } from 'sonner';
import { useTheme } from '@/shared/hooks/useTheme';

/** Thin wrapper so sonner picks up our resolved (not just selected) theme — needs to live inside ThemeProvider. */
export function AppToaster(): React.JSX.Element {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      theme={resolvedTheme}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: 'var(--glass-surface-hover)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-primary)',
          backdropFilter: 'blur(12px)',
        },
      }}
    />
  );
}
