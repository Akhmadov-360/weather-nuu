import { History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ArchiveDataBannerProps = {
  /** ISO date of the last known reading. */
  lastSeenDate: string;
};

/**
 * Calm/neutral, not an error state — a quiet sensor over a break (summer,
 * building closed, ...) is an expected condition, not a failure the user
 * needs to be alarmed about.
 */
export function ArchiveDataBanner({ lastSeenDate }: ArchiveDataBannerProps): React.JSX.Element {
  const { t, i18n } = useTranslation();

  const time = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(lastSeenDate));

  return (
    <div className="flex items-start gap-3 rounded-card border border-[var(--glass-border)] bg-[var(--glass-surface)] p-4 shadow-card backdrop-blur-md">
      <div className="shrink-0 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-surface-hover)] p-2 text-muted-themed">
        <History className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-primary-themed">{t('archive_banner_title')}</div>
        <div className="mt-0.5 text-xs text-secondary-themed sm:text-sm">
          {t('archive_banner_description', { time })}
        </div>
      </div>
    </div>
  );
}
