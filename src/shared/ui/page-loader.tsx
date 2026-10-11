import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { DashRing } from '@/components/ui/dash-ring';

export function PageLoader(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="dash-bg flex min-h-screen items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
        <DashRing className="h-12 w-12 text-status-info motion-reduce:hidden" aria-label={t('page_loading')} />
        <div className="text-xs uppercase tracking-[0.25em] text-muted-themed">{t('page_loading')}</div>
      </motion.div>
    </div>
  );
}
