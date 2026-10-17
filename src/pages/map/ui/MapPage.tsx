import { useTranslation } from 'react-i18next';

/**
 * Placeholder of the map section. The map zone replaces the body (task T1); the route, the section
 * entry and the `map` translation namespace are already in place.
 */
export default function MapPage(): React.JSX.Element {
  const { t } = useTranslation('map');
  return (
    <section className="mt-6 rounded-2xl border border-(--glass-border) bg-(--glass-surface) p-6">
      <h2 className="text-lg font-semibold text-primary-themed">{t('placeholder_title')}</h2>
      <p className="mt-2 max-w-prose text-secondary-themed">{t('placeholder_text')}</p>
    </section>
  );
}
