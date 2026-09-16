import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftRight, Monitor, Moon, Sun } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme, type ThemeMode } from '@/shared/hooks/useTheme';
import { useScrolledPast } from '@/shared/hooks/useScrolledPast';
import { LanguageSwitcher } from '@/widgets/language-switcher/ui/LanguageSwitcher';
import { Logo } from '../../../components/Logo';

type TopBarProps = {
  titleKey: string;
  switchPath: string;
  switchLabelKey: string;
};

/** Vertical hairline between the compact settings triggers — replaces the old per-item pill borders. */
function Divider(): React.JSX.Element {
  return <span className="h-5 w-px shrink-0 bg-[var(--glass-border)]" aria-hidden />;
}

export function TopBar({ titleKey, switchPath, switchLabelKey }: TopBarProps): React.JSX.Element {
  const { t } = useTranslation();
  const { mode, resolvedTheme, setMode } = useTheme();
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
          <ThemeToggle mode={mode} resolvedTheme={resolvedTheme} onModeChange={setMode} />
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
                  <ThemeToggle mode={mode} resolvedTheme={resolvedTheme} onModeChange={setMode} />
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
          ? 'h-10 gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-surface)] px-4 text-sm text-primary-themed backdrop-blur-md transition-colors hover:bg-[var(--glass-surface-hover)]'
          : 'h-9 gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-surface)] px-3 text-xs text-primary-themed backdrop-blur-md transition-colors hover:bg-[var(--glass-surface-hover)] sm:px-4 sm:text-sm'
      }
    >
      <Link to={to}>
        <ArrowLeftRight className="h-3.5 w-3.5 opacity-70" />
        {label}
      </Link>
    </Button>
  );
}

const MODE_ICON: Record<ThemeMode, React.ElementType> = { light: Sun, dark: Moon, system: Monitor };

function ThemeToggle({
  mode,
  resolvedTheme,
  onModeChange,
}: {
  mode: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  onModeChange: (mode: ThemeMode) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const Icon = MODE_ICON[mode];
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* No border/bg of its own — the divider on either side is what separates it now. */}
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon-sm"
          aria-label={t('theme_toggle_label')}
          className="h-9 w-9 rounded-full text-primary-themed transition-colors hover:bg-[var(--glass-surface-hover)]"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={mode === 'system' ? `system-${resolvedTheme}` : mode}
              initial={{ rotate: -30, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 30, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Icon className="h-4 w-4" />
            </motion.span>
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => {
            onModeChange(value as ThemeMode);
            // Radix returns focus to the trigger on select, which leaves its
            // focus-visible ring visibly "stuck" after a plain mouse pick —
            // blurring it is the standard fix (keyboard users still get the
            // ring while actually navigating).
            triggerRef.current?.blur();
          }}
        >
          <DropdownMenuRadioItem value="light">
            <Sun className="h-4 w-4" /> {t('theme_light')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="h-4 w-4" /> {t('theme_dark')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="h-4 w-4" /> {t('theme_system')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
