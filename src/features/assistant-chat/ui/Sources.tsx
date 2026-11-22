import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Citation } from '../model/events';

/** Only an address that is a plain https link is opened; anything else is shown as text. */
function safeHref(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

const chip = 'inline-flex max-w-full items-center gap-1 rounded-full border border-(--ai-ink)/15 px-2.5 py-1 text-xs leading-none text-(--ai-muted)';

/** The documents an answer is based on, under the answer. A document with an address opens in a new tab. */
export function Sources({ items }: { items: readonly Citation[] }): React.JSX.Element {
  const { t } = useTranslation('assistant');
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="assistant-sources">
      <span className="text-xs text-(--ai-muted)">{t('assistant_sources')}:</span>
      {items.map((item) => {
        const href = safeHref(item.url);
        return href ? (
          <a
            key={item.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={item.title}
            className={`${chip} transition-colors hover:border-(--ai-accent) hover:text-(--ai-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ai-accent)`}
          >
            <span className="truncate">{item.source}</span>
            <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
          </a>
        ) : (
          <span key={item.id} title={item.title} className={chip}>
            <span className="truncate">{item.source}</span>
          </span>
        );
      })}
    </div>
  );
}
