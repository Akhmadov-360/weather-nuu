import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useScrolledPast } from '@/shared/hooks/useScrolledPast';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from '@/widgets/language-switcher/ui/LanguageSwitcher';
import { Logo } from '../../../components/Logo';

type TopBarProps = {
  titleKey: string;
  switchPath: string;
  switchLabelKey: string;
};

/** Vertical hairline between the compact settings triggers — replaces the old per-item pill borders. */
function Divider(): React.JSX.Element {
  return <span className="h-5 w-px shrink-0 bg-(--glass-border)" aria-hidden />;
}

export function TopBar({ titleKey, switchPath, switchLabelKey }: TopBarProps): React.JSX.Element {
  const { t } = useTranslation();
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
          <SwitchSectionLink to={switchPath} label={t(switchLabelKey)} size="default" />
          <Divider />
          <ThemeToggle />
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
                  <SwitchSectionLink to={switchPath} label={t(switchLabelKey)} size="sm" />
                  <Divider />
                  <ThemeToggle />
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

/**
 * The one element in the group that stays a filled, bordered pill — it's a
 * navigation action (goes to a different page), not a setting, so it needs
 * to keep reading as clickable now that the settings around it no longer
 * carry their own containers.
 */
function SwitchSectionLink({
  to,
  label,
  size,
}: {
  to: string;
  label: string;
  size: 'default' | 'sm';
}): React.JSX.Element {
  return (
    <Button
      asChild
      variant="ghost"
      className={
        size === 'default'
          ? 'h-10 gap-1.5 rounded-full border border-(--glass-border) bg-(--glass-surface) px-4 text-sm text-primary-themed backdrop-blur-md transition-colors hover:bg-(--glass-surface-hover)'
          : 'h-9 gap-1.5 rounded-full border border-(--glass-border) bg-(--glass-surface) px-3 text-xs text-primary-themed backdrop-blur-md transition-colors hover:bg-(--glass-surface-hover) sm:px-4 sm:text-sm'
      }
    >
      <Link to={to}>
        <ArrowLeftRight className="h-3.5 w-3.5 opacity-70" />
        {label}
      </Link>
    </Button>
  );
}
