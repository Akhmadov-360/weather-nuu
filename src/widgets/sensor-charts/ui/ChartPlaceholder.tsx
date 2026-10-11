import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { DashRing } from '@/components/ui/dash-ring';

const FRAME_CLASS =
  'relative flex min-h-[220px] w-full flex-1 flex-col items-center justify-center gap-3 overflow-hidden px-4 text-center sm:min-h-[300px] lg:min-h-[360px]';

/** Chart-shaped backdrop: faint gridlines and a line that is either drawing itself (loading) or lying flat (empty). */
function Backdrop({ flat }: { flat: boolean }): React.JSX.Element {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full text-(--text-muted)" preserveAspectRatio="none" viewBox="0 0 400 200" aria-hidden fill="none">
      {[40, 80, 120, 160].map((y) => (
        <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="currentColor" strokeOpacity=".12" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
      ))}
      <path
        d={flat ? 'M0 100 H400' : 'M0 130 C40 120 60 70 100 80 S160 140 200 110 S260 50 300 70 S360 120 400 90'}
        stroke="currentColor"
        strokeOpacity={flat ? 0.3 : 0.22}
        strokeWidth="2"
        strokeDasharray={flat ? '3 7' : '12 10'}
        vectorEffect="non-scaling-stroke"
        className={flat ? undefined : 'chart-skeleton-line'}
      />
    </svg>
  );
}

/** Loading state of the history chart: same footprint as the chart so the card does not jump when data arrives. */
export function ChartLoading(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className={FRAME_CLASS} role="status">
      <Backdrop flat={false} />
      <DashRing className="relative h-9 w-9 text-status-info motion-reduce:hidden" aria-hidden />
      <div className="relative text-sm text-muted-themed">{t('chart_loading')}</div>
    </motion.div>
  );
}

/** Empty state: says what is missing and offers a wider period instead of leaving a dead end. */
export function ChartEmpty({ onWiden }: { onWiden?: () => void }): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className={FRAME_CLASS}>
      <Backdrop flat />
      <div className="relative text-base font-medium text-secondary-themed">{t('no_data_for_range')}</div>
      <div className="relative max-w-sm text-sm text-muted-themed">{t('chart_empty_hint')}</div>
      {onWiden ? (
        <button
          type="button"
          onClick={onWiden}
          className="relative mt-1 rounded-full border border-(--status-info)/60 px-4 py-2 text-sm text-(--status-info) transition-colors hover:bg-(--status-info)/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--status-info)"
        >
          {t('chart_empty_widen')}
        </button>
      ) : null}
    </motion.div>
  );
}
