import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { enabledSections, hasSectionNav, type Section } from '@/shared/config/sections';
import { cn } from '@/shared/lib/cn';
import { useScrolledPast } from '@/shared/hooks/useScrolledPast';
import { AtmosphereControl } from '@/features/atmosphere-settings/ui/AtmosphereControl';
import { LanguageSwitcher } from '@/widgets/language-switcher/ui/LanguageSwitcher';
import { Logo } from '../../../components/Logo';
import { SwapArrows } from './SwapArrows';
import { ThemeToggle } from './ThemeToggle';

type TopBarProps = {
  titleKey: string;
  /** Short name of the current section ("Аудитория"), used by the compact phone bar. */
  sectionKey: string;
  switchPath: string;
  switchLabelKey: string;
};

/** Vertical hairline between the compact settings triggers — replaces the old per-item pill borders. */
function Divider({ className }: { className?: string }): React.JSX.Element {
  return <span className={cn('h-5 w-px shrink-0 bg-(--glass-border)', className)} aria-hidden />;
}

/** Theme and language: the two settings that stay on every screen size. */
function Settings(): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 sm:gap-3">
      <AtmosphereControl />
      <ThemeToggle />
      {/* On phones the pill is gone, so the hairline sits between the two settings instead. */}
      <Divider className="sm:hidden" />
      <LanguageSwitcher />
    </div>
  );
}

/** Logo plus the university abbreviation; the full name is in the logo tooltip. */
function Brand(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Logo />
      <span className="text-sm font-semibold tracking-wide text-primary-themed">{t('university_short')}</span>
    </div>
  );
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

export function TopBar({ titleKey, sectionKey, switchPath, switchLabelKey }: TopBarProps): React.JSX.Element {
  const { t } = useTranslation();
  const isStickyVisible = useScrolledPast(110);
  const sections = enabledSections();
  // Two dashboards keep the swap link; with more sections a full switch replaces it.
  const sectionNav = hasSectionNav(sections);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        {/* Phones: the university and the settings share the first row, the section tabs span the full width. */}
        <div className="flex items-center justify-between sm:hidden">
          <Brand />
          <Settings />
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:block">
            <Logo />
          </span>
          <Title
            as="h1"
            titleKey={titleKey}
            className="text-xl font-semibold tracking-tight text-primary-themed sm:text-2xl"
          />
        </div>

        <SectionSwitch id="header" sections={sections} className="w-full sm:hidden" />

        <div className="hidden items-center gap-3 sm:flex">
          {sectionNav ? (
            <SectionSwitch id="header-wide" sections={sections} size="default" className="w-auto" />
          ) : (
            <SwitchSectionLink to={switchPath} label={switchLabelKey} size="default" />
          )}
          <Divider />
          <Settings />
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
              data-atmosphere-header
              className="mx-auto max-w-[1440px] border px-3 py-2.5 backdrop-blur-xl sm:px-4 sm:py-3"
              style={{
                borderRadius: '18px',
                backgroundColor: 'var(--topbar-bg)',
                borderColor: 'var(--glass-border)',
                boxShadow: 'var(--panel-shadow)',
              }}
            >
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                {/* Phones: abbreviation and current section; the tabs are in the main header. */}
                <div className="flex min-w-0 items-center gap-2 sm:hidden">
                  <Brand />
                  {/* Below 360 px there is no room for the section name next to the abbreviation. */}
                  <span className="hidden text-muted-themed min-[360px]:inline" aria-hidden>
                    ·
                  </span>
                  <span className="hidden truncate text-sm text-secondary-themed min-[360px]:inline">
                    {t(sectionKey)}
                  </span>
                </div>
                <div className="hidden min-w-0 items-center gap-3 sm:flex">
                  <Logo />
                  <Title
                    as="h2"
                    titleKey={titleKey}
                    className="truncate text-sm font-medium text-primary-themed sm:text-base"
                  />
                </div>

                <div className="flex items-center gap-3">
                  {sectionNav ? (
                    <SectionSwitch id="sticky" sections={sections} size="sm" className="hidden w-auto sm:flex" />
                  ) : (
                    <SwitchSectionLink to={switchPath} label={switchLabelKey} size="sm" className="hidden sm:inline-flex" />
                  )}
                  <Divider className="hidden sm:block" />
                  <Settings />
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
function SectionSwitch({
  id,
  sections,
  size = 'phone',
  className,
}: {
  id: string;
  sections: readonly Section[];
  size?: 'phone' | 'default' | 'sm';
  className?: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <nav
      aria-label={t('nav_sections')}
      className={cn(
        'relative flex items-center rounded-full border border-(--glass-border) bg-(--control-track) p-1',
        size === 'phone' ? 'h-11' : size === 'default' ? 'h-10' : 'h-9',
        className,
      )}
    >
      {sections.map(({ to, navKey }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative z-10 flex h-full items-center justify-center rounded-full px-3 font-medium transition-colors',
              size === 'phone' ? 'min-w-0 flex-1 text-sm max-[359px]:px-1.5 max-[359px]:text-xs' : size === 'default' ? 'px-4 text-sm' : 'text-xs sm:px-4 sm:text-sm',
              active ? 'text-primary-themed' : 'text-muted-themed',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`section-pill-${id}`}
                className="absolute inset-0 -z-10 rounded-full bg-(--control-active) shadow-sm"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            ) : null}
            {t(navKey)}
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
          ? 'h-10 gap-1.5 rounded-full border border-(--glass-border) bg-(--glass-surface) px-4 text-sm text-primary-themed transition-colors hover:bg-(--control-hover)'
          : 'h-9 gap-1.5 rounded-full border border-(--glass-border) bg-(--glass-surface) px-3 text-xs text-primary-themed transition-colors hover:bg-(--control-hover) sm:px-4 sm:text-sm',
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
