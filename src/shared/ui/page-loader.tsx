import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function PageLoader(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="dash-bg flex min-h-screen items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--glass-border)] border-t-status-info" />
        <div className="text-xs uppercase tracking-[0.25em] text-muted-themed">{t('page_loading')}</div>
      </motion.div>
    </div>
  );
}
