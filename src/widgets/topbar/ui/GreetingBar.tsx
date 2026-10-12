import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { EventId } from '@/entities/atmosphere/model/calendar';

/** A thin, dismissible holiday line above the header. It is text first: it stays on the calm level too. */
export function GreetingBar({ event, onClose }: { event: EventId; onClose: () => void }): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className="mb-3 flex items-center justify-between gap-3 rounded-full border border-(--glass-border) bg-(--surface) px-4 py-1.5 text-sm text-primary-themed shadow-card"
    >
      <span className="min-w-0 truncate" style={{ color: 'var(--season-accent)' }}>
        {t(`greeting_${event}`)}
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('greeting_close')}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-themed transition-colors hover:bg-(--control-hover) hover:text-primary-themed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--status-info)"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
