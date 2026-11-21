import { Toaster } from 'sileo';
import 'sileo/styles.css';
import { useTheme } from '@/shared/hooks/useTheme';

/** Toasts (sileo, spring-physics): a thin wrapper so they follow our resolved theme. Lives inside ThemeProvider. */
export function AppToaster(): React.JSX.Element {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      theme={resolvedTheme}
      position="top-center"
      offset={{ top: 72 }}
      options={{ fill: resolvedTheme === 'dark' ? '#171C30' : '#FFFFFF', roundness: 18 }}
    />
  );
}
