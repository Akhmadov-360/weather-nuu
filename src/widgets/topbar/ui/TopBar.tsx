import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/shared/config/routes';
import { cn } from '@/shared/lib/cn';
import { useScrolledPast } from '@/shared/hooks/useScrolledPast';
import { LanguageSwitcher } from '@/widgets/language-switcher/ui/LanguageSwitcher';
import { Logo } from '../../../components/Logo';
import { SwapArrows } from './SwapArrows';
import { ThemeToggle } from './ThemeToggle';

type TopBarProps = {
  titleKey: string;
  switchPath: string;
  switchLabelKey: string;
};

const SECTIONS = [
  { to: ROUTES.room, labelKey: 'nav_room' },
  { to: ROUTES.street, labelKey: 'nav_street' },
] as const;

/** Vertical hairline between the compact settings triggers — replaces the old per-item pill borders. */
function Divider(): React.JSX.Element {
  return <span className="hidden h-5 w-px shrink-0 bg-(--glass-border) sm:block" aria-hidden />;
}

/** The page title: only the text changes when the section does, the header around it stays. */
function Title({
  titleKey,
  as: Tag,
  className,
}: {
  titleKey: string;
  as: 'h1' | 'h2';
  className: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const MotionTag = motion[Tag];
  return (
    <AnimatePresence mode="wait" initial={false}>
      <MotionTag
        key={titleKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={className}
      >
        {t(titleKey)}
      </MotionTag>
    </AnimatePresence>
  );
}

export function TopBar({ titleKey, switchPath, switchLabelKey }: TopBarProps): React.JSX.Element {
  const isStickyVisible = useScrolledPast(110);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        <div className="flex items-center gap-3">
          <Logo />
          <Title
            as="h1"
            titleKey={titleKey}
            className="text-xl font-semibold tracking-tight text-primary-themed sm:text-2xl"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <SectionSwitch id="header" className="flex-1 sm:hidden" />
          <SwitchSectionLink to={switchPath} label={switchLabelKey} size="default" className="hidden sm:inline-flex" />
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
              className="mx-auto max-w-[1440px] border px-3 py-2.5 backdrop-blur-xl sm:px-4 sm:py-3"
              style={{
                borderRadius: '18px',
                backgroundColor: 'var(--topbar-bg)',
                borderColor: 'var(--glass-border)',
                boxShadow: 'var(--panel-shadow)',
              }}
            >
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Logo />
                  <Title
                    as="h2"
                    titleKey={titleKey}
                    className="hidden truncate text-sm font-medium text-primary-themed sm:block sm:text-base"
                  />
                </div>

                <div className="flex items-center gap-1 sm:gap-3">
                  <SectionSwitch id="sticky" className="sm:hidden" />
                  <SwitchSectionLink
                    to={switchPath}
                    label={switchLabelKey}
                    size="sm"
                    className="hidden sm:inline-flex"
                  />
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
 * Phone version of the section switch: both sections visible, the active one
 * marked by a pill that glides to the other when the page changes.
 */
function SectionSwitch({ id, className }: { id: string; className?: string }): React.JSX.Element {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <nav
      aria-label={t('nav_sections')}
      className={cn(
        'relative flex h-10 items-center rounded-full border border-(--glass-border) bg-(--glass-surface) p-0.5 backdrop-blur-md',
        className,
      )}
    >
      {SECTIONS.map(({ to, labelKey }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative z-10 flex h-full flex-1 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors',
              active ? 'text-primary-themed' : 'text-muted-themed',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`section-pill-${id}`}
                className="absolute inset-0 -z-10 rounded-full bg-(--glass-surface-hover) shadow-sm"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            ) : null}
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
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
  className,
}: {
  to: string;
  label: string;
  size: 'default' | 'sm';
  className?: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [burst, setBurst] = useState(0);

  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        size === 'default'
          ? 'h-10 gap-1.5 rounded-full border border-(--glass-border) bg-(--glass-surface) px-4 text-sm text-primary-themed backdrop-blur-md transition-colors hover:bg-(--glass-surface-hover)'
          : 'h-9 gap-1.5 rounded-full border border-(--glass-border) bg-(--glass-surface) px-3 text-xs text-primary-themed backdrop-blur-md transition-colors hover:bg-(--glass-surface-hover) sm:px-4 sm:text-sm',
        className,
      )}
    >
      <Link to={to} onClick={() => setBurst((n) => n + 1)}>
        <SwapArrows burst={burst} />
        {t(label)}
      </Link>
    </Button>
  );
}
