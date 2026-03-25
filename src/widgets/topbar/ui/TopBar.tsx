import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { LanguageSwitcher } from '@/widgets/language-switcher/ui/LanguageSwitcher';

type TopBarProps = {
  titleKey: string;
  switchPath: string;
  switchLabelKey: string;
};

export function TopBar({ titleKey, switchPath, switchLabelKey }: TopBarProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <header className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t(titleKey)}</h1>
      </div>

      <div className="flex items-center gap-3">
        <Button asChild variant="outline">
          <Link to={switchPath}>{t(switchLabelKey)}</Link>
        </Button>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
