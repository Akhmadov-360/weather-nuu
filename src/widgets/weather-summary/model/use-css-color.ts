import { useEffect, useState } from 'react';

import { useTheme } from '@/shared/hooks/useTheme';

/** Canvas cannot read `var(--x)`, so resolve a token to its current value; follows the theme. */
export function useCssColor(token: string, fallback: string): string {
  const { resolvedTheme } = useTheme();
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    const resolved = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    setValue(resolved || fallback);
  }, [token, fallback, resolvedTheme]);

  return value;
}
