import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/shared/hooks/useTheme';
import { useScrolledPast } from '@/shared/hooks/useScrolledPast';
import { LanguageSwitcher } from '@/widgets/language-switcher/ui/LanguageSwitcher';
import { Logo } from '../../../components/Logo';

type TopBarProps = {
  titleKey: string;
  switchPath: string;
  switchLabelKey: string;
};

const NAV_BTN_CLASS =
  'h-10 rounded-full border border-[var(--glass-border)] px-4 text-sm text-primary-themed backdrop-blur-md transition-all';

export function TopBar({ titleKey, switchPath, switchLabelKey }: TopBarProps): React.JSX.Element {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isStickyVisible = useScrolledPast(110);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <Logo />
          <h1 className="text-xl font-semibold tracking-tight text-primary-themed sm:text-2xl">
            {t(titleKey)}
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            asChild
            variant="ghost"
            className={NAV_BTN_CLASS}
            style={{ backgroundColor: 'var(--glass-surface)' }}
          >
            <Link to={switchPath}>{t(switchLabelKey)}</Link>
          </Button>

          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <LanguageSwitcher />
        </div>
      </motion.header>

      <AnimatePresence>
        {isStickyVisible ? (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6"
          >
            <div
              className="mx-auto max-w-[1440px] border px-4 py-3 backdrop-blur-xl"
              style={{
                borderRadius: '18px',
                backgroundColor: 'var(--topbar-bg)',
                borderColor: 'var(--glass-border)',
                boxShadow: 'var(--panel-shadow)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Logo />
                  <h2 className="truncate text-sm font-medium text-primary-themed sm:text-base">
                    {t(titleKey)}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    variant="ghost"
                    className="h-9 rounded-full border px-3 text-xs text-primary-themed backdrop-blur-md transition-all sm:px-4 sm:text-sm"
                    style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-surface)' }}
                  >
                    <Link to={switchPath}>{t(switchLabelKey)}</Link>
                  </Button>

                  <ThemeToggle theme={theme} onToggle={toggleTheme} />
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: 'dark' | 'light';
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="h-10 w-10 rounded-full border text-primary-themed backdrop-blur-md transition-all"
      style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-surface)' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === 'dark' ? (
          <motion.span
            key="moon"
            initial={{ rotate: -30, opacity: 0, scale: 0.8 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 30, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ rotate: 30, opacity: 0, scale: 0.8 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -30, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
