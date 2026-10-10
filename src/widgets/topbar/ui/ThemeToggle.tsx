import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/shared/hooks/useTheme';

/**
 * One button: it switches to the opposite of the theme that is shown. The new
 * theme spreads from the click point (see ThemeProvider.toggle); the icon
 * turns over in step with it.
 */
export function ThemeToggle(): React.JSX.Element {
  const { t } = useTranslation();
  const { resolvedTheme, toggle } = useTheme();
  const reduceMotion = useReducedMotion();
  const Icon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t(resolvedTheme === 'dark' ? 'theme_switch_to_light' : 'theme_switch_to_dark')}
      className="h-10 w-10 rounded-full text-primary-themed transition-colors hover:bg-(--control-hover) sm:h-9 sm:w-9"
      onClick={(event) => {
        // Keyboard activation reports (0, 0): spread from the button itself then.
        const rect = event.currentTarget.getBoundingClientRect();
        const hasPointer = event.clientX !== 0 || event.clientY !== 0;
        toggle(
          hasPointer
            ? { x: event.clientX, y: event.clientY }
            : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        );
        event.currentTarget.blur();
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={resolvedTheme}
          initial={reduceMotion ? false : { rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={reduceMotion ? undefined : { rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26, duration: 0.25 }}
          className="flex"
        >
          <Icon className="h-4 w-4" />
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
