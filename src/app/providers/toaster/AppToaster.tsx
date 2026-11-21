import { Toaster } from 'sileo';
import 'sileo/styles.css';
import { useTheme } from '@/shared/hooks/useTheme';

/** Toasts (sileo, spring-physics): a thin wrapper so they follow our resolved theme. Lives inside ThemeProvider. */
export function AppToaster(): React.JSX.Element {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';

  return (
    <Toaster
      theme={resolvedTheme}
      position="top-center"
      offset={{ top: 72 }}
      options={{
        fill: dark ? '#171C30' : '#FFFFFF',
        roundness: 18,
        // On the dark fill the default grey text is nearly invisible (a file name under "Saved"): make it light.
        styles: dark ? { title: 'text-white!', description: 'text-white/80!' } : { title: 'text-slate-900!', description: 'text-slate-600!' },
      }}
    />
  );
}
