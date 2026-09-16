import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Globe } from 'lucide-react';

const LANGUAGES = ['ru', 'en', 'uz'] as const;

/** Native name of each language, in its own script — shown in the open dropdown list. */
const LANGUAGE_NAMES: Record<(typeof LANGUAGES)[number], string> = {
  ru: 'Русский',
  en: 'English',
  uz: "O'zbekcha",
};

export function LanguageSwitcher(): React.JSX.Element {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* No border/bg — matches ThemeToggle now that the group uses dividers, not per-item pills. */}
        <Button
          ref={triggerRef}
          variant="ghost"
          className="h-9 gap-1.5 rounded-full px-2.5 text-sm text-primary-themed transition-colors hover:bg-[var(--glass-surface-hover)]"
        >
          <Globe className="h-4 w-4 opacity-70" />
          {currentLang.toUpperCase()}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        {LANGUAGES.map((lang) => {
          const isActive = currentLang === lang;
          return (
            <DropdownMenuItem
              key={lang}
              onClick={() => {
                void i18n.changeLanguage(lang);
                // Same reason as ThemeToggle — don't leave a stuck focus ring on the trigger.
                triggerRef.current?.blur();
              }}
              className="flex cursor-pointer items-center justify-between"
            >
              <span>{LANGUAGE_NAMES[lang]}</span>
              {isActive && <Check className="h-4 w-4 text-status-info" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
