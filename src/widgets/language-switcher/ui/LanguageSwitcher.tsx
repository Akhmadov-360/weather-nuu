import { useTranslation } from 'react-i18next';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, Globe } from 'lucide-react';

const LANGUAGES = ['ru', 'en', 'uz'] as const;

export function LanguageSwitcher(): React.JSX.Element {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 rounded-full border px-4 text-sm text-primary-themed backdrop-blur-md"
          style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-surface)' }}
        >
          <Globe className="mr-2 h-4 w-4 opacity-70" />
          {currentLang.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-32 rounded-xl border p-1 backdrop-blur-xl"
        style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--topbar-bg)' }}
      >
        {LANGUAGES.map((lang) => {
          const isActive = currentLang === lang;
          return (
            <DropdownMenuItem
              key={lang}
              onClick={() => void i18n.changeLanguage(lang)}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-primary-themed focus:bg-[var(--glass-surface-hover)]"
            >
              <span>{lang.toUpperCase()}</span>
              {isActive && <Check className="h-4 w-4 text-blue-500 dark:text-blue-400" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
