import { useTranslation } from 'react-i18next';

/**
 * Placeholder of the analytics section. The analytics zone replaces the body (tasks A0 and F0); the route, the section
 * entry and the `analytics` translation namespace are already in place.
 */
export default function AnalyticsPage(): React.JSX.Element {
  const { t } = useTranslation('analytics');
  return (
    <section className="mt-6 rounded-2xl border border-(--glass-border) bg-(--glass-surface) p-6">
      <h2 className="text-lg font-semibold text-primary-themed">{t('placeholder_title')}</h2>
      <p className="mt-2 max-w-prose text-secondary-themed">{t('placeholder_text')}</p>
    </section>
  );
}
