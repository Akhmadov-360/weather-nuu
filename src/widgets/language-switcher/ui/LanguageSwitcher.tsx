import { motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const LANGUAGES = ['ru', 'en', 'uz'] as const;
type Language = (typeof LANGUAGES)[number];

/** Native name of each language, in its own script — shown in the open dropdown list. */
const LANGUAGE_NAMES: Record<Language, string> = {
  ru: 'Русский',
  en: 'English',
  uz: "O'zbekcha",
};

/** Grace period so the menu does not close while the pointer crosses the gap to it. */
const CLOSE_DELAY_MS = 120;

/**
 * The menu opens on hover (mouse) and on click, tap or keyboard. A single
 * highlight follows the hovered or focused item and glides between items
 * instead of switching on and off.
 */
export function LanguageSwitcher(): React.JSX.Element {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Language | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const openNow = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(next) => {
        window.clearTimeout(closeTimer.current);
        setOpen(next);
        if (!next) setActive(null);
      }}
    >
      <DropdownMenuTrigger asChild>
        {/* No border/bg — matches ThemeToggle now that the group uses dividers, not per-item pills. */}
        <Button
          variant="ghost"
          className="h-10 gap-1.5 rounded-full px-3 text-sm text-primary-themed transition-colors hover:bg-(--glass-surface-hover) sm:h-9 sm:px-2.5"
          onPointerEnter={(event) => event.pointerType === 'mouse' && openNow()}
          onPointerLeave={(event) => event.pointerType === 'mouse' && closeSoon()}
          // A mouse click on an already hover-opened menu must not close it again.
          onPointerDown={(event) => {
            if (event.pointerType === 'mouse' && open) event.preventDefault();
          }}
        >
          <Globe className="hidden h-4 w-4 opacity-70 sm:block" />
          {currentLang.toUpperCase()}
          <ChevronDown className="hidden h-3 w-3 opacity-50 sm:block" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-40"
        onPointerEnter={(event) => event.pointerType === 'mouse' && openNow()}
        onPointerLeave={(event) => event.pointerType === 'mouse' && closeSoon()}
      >
        {LANGUAGES.map((lang) => {
          const isActive = currentLang === lang;
          return (
            <DropdownMenuItem
              key={lang}
              onSelect={() => void i18n.changeLanguage(lang)}
              onPointerEnter={() => setActive(lang)}
              onFocus={() => setActive(lang)}
              className="relative flex cursor-pointer items-center justify-between focus:bg-transparent"
            >
              {active === lang ? (
                <motion.span
                  layoutId="language-highlight"
                  className="absolute inset-0 rounded-md bg-(--glass-surface-hover)"
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }}
                />
              ) : null}
              <span className="relative">{LANGUAGE_NAMES[lang]}</span>
              {isActive && <Check className="relative h-4 w-4 text-status-info" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
