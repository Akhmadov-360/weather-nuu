import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';

const LANGUAGES = ['ru', 'en', 'uz'] as const;

export function LanguageSwitcher(): React.JSX.Element {
  const { i18n } = useTranslation();

  return (
    <div className="flex gap-2">
      {LANGUAGES.map((lang) => (
        <Button
          key={lang}
          size="sm"
          variant={i18n.language === lang ? 'default' : 'outline'}
          onClick={() => {
            void i18n.changeLanguage(lang);
          }}
        >
          {lang.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
