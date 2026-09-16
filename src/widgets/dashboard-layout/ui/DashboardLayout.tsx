import { useLatestWeatherQuery, useWeatherHistoryQuery } from '@/entities/weather/api/weather.queries';
import { useWeatherSocket } from '@/entities/weather/api/useWeatherSocket';
import { computeFreshness } from '@/entities/weather/model/weather-freshness';
import type { DashboardPageConfig } from '@/entities/weather/model/weather.types';
import { GlassPanel } from '@/shared/ui/glass-panel';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { motion, type Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { SensorCharts } from '@/widgets/sensor-charts/ui/SensorCharts';
import { TopBar } from '@/widgets/topbar/ui/TopBar';
import { MetricCard } from '@/widgets/weather-summary/ui/MetricCard';
import { TempHeroCard } from '@/widgets/weather-summary/ui/TempHeroCard';
import { ArchiveDataBanner } from './ArchiveDataBanner';
import { SensorChartsSkeleton } from './SensorChartsSkeletom';
import { TimeDisplay } from './TimeDisplay';
import { WeatherSummarySkeleton } from './WeatherSummarySkeleton';
import { LiveStreams } from '../../../components/LiveStreams';

type DashboardLayoutProps = {
  config: DashboardPageConfig;
};

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 18 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
  },
};

/**
 * One flat grid — time, temp hero and the 4 metric tiles are all siblings
 * of the same grid context, so row heights sync automatically (the tallest
 * cell in a row sets that row's height for every column). A {time, temp}
 * column next to an independent 2x2 metrics grid used to leave a dead gap
 * under whichever column was shorter, since each grid balanced its own
 * rows in isolation.
 */
const summaryGridClass =
  'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-[minmax(240px,300px)_repeat(2,minmax(0,1fr))] lg:grid-rows-2';

export function DashboardLayout({ config }: DashboardLayoutProps): React.JSX.Element {
  const latestQuery  = useLatestWeatherQuery(config.key);
  const historyQuery = useWeatherHistoryQuery(config.key);
  useWeatherSocket(config.key);
  const { t } = useTranslation();

  const isInitialLoading = latestQuery.isLoading  || historyQuery.isLoading;
  const isError          = latestQuery.isError    || historyQuery.isError;
  // isFetching = true и при initial load, и при background refetch
  const isRefetching     = (latestQuery.isFetching || historyQuery.isFetching) && !isInitialLoading;

  const latest  = latestQuery.data;
  const history = historyQuery.data;
  const freshness = history ? computeFreshness(history) : 'live';

  return (
    <main className="relative min-h-screen overflow-hidden text-primary-themed">
      <BackgroundLayer />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <TopBar
          titleKey={config.titleKey}
          switchPath={config.oppositePath}
          switchLabelKey={config.oppositeNavKey}
        />

        {isInitialLoading ? (
          <div className="mt-6 flex flex-1 flex-col gap-6">
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <WeatherSummarySkeleton />
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex-1">
              <SensorChartsSkeleton />
            </motion.div>
          </div>

        ) : isError ? (
          <div className="mt-6">
            <GlassPanel className="p-6">
              <ErrorState
                message={t('error_data')}
                onRetry={() => {
                  void latestQuery.refetch();
                  void historyQuery.refetch();
                }}
              />
            </GlassPanel>
          </div>

        ) : !latest || !history || history.length === 0 ? (
          <div className="mt-6">
            <GlassPanel className="p-6">
              <EmptyState title={t('empty_title')} description={t('empty_description')} />
            </GlassPanel>
          </div>

        ) : (
          <div className="mt-6 flex flex-1 flex-col gap-6">
            <motion.div variants={fadeUp} initial="hidden" animate="visible" className={summaryGridClass}>
              <TimeDisplay freshness={freshness} />
              <MetricCard sensor="hum" label={t('lbl_hum')} value={latest.hum} />
              <MetricCard sensor="press" label={t('lbl_press')} value={latest.press} />
              <TempHeroCard temp={latest.temp} history={history} />
              <MetricCard sensor="mq5" label={t('lbl_mq5')} value={latest.mq5} />
              <MetricCard sensor="mq3" label={t('lbl_mq3')} value={latest.mq3} />
            </motion.div>

            {freshness !== 'live' && (
              <motion.div variants={fadeUp} initial="hidden" animate="visible">
                <ArchiveDataBanner lastSeenDate={history[history.length - 1]!.date} />
              </motion.div>
            )}

            <motion.section
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1, duration: 0.45, ease: 'easeOut' }}
              className="flex-1"
            >
              <SensorCharts type={config.key} history={history} isRefetching={isRefetching} />
            </motion.section>

            <LiveStreams />
          </div>
        )}
      </div>
    </main>
  );
}

function BackgroundLayer(): React.JSX.Element {
  return <div className="dash-bg absolute inset-0" />;
}
