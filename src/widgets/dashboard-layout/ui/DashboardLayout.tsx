import { useDustDayMeanQuery, useLatestWeatherQuery, useWeatherHistoryQuery } from '@/entities/weather/api/weather.queries';
import { useWeatherSocket } from '@/entities/weather/api/useWeatherSocket';
import type { ConnectionState } from '@/entities/weather/model/connection';
import { ConnectionProvider, useConnectionState } from '@/entities/weather/model/connection-context';
import type { DashboardPageConfig } from '@/entities/weather/model/weather.types';
import { GlassPanel } from '@/shared/ui/glass-panel';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { motion, type Variants } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import { AirQualityCard } from '@/widgets/weather-summary/ui/AirQualityCard';
import { GasStrip } from '@/widgets/weather-summary/ui/GasStrip';
import { TimeCard } from '@/widgets/time-card/ui/TimeCard';
import { HumidityCard } from '@/widgets/weather-summary/ui/HumidityCard';
import { PressureCard } from '@/widgets/weather-summary/ui/PressureCard';
import { TemperatureCard } from '@/widgets/weather-summary/ui/TemperatureCard';
import { ConnectionBanner } from './ConnectionBanner';
import { SensorChartsSkeleton } from './SensorChartsSkeleton';
import { WeatherSummarySkeleton } from './WeatherSummarySkeleton';
import { previewNow } from '@/widgets/time-card/model/station-time';
import { LiveStreams } from '../../../components/LiveStreams';

// ECharts is ~2 MB: load it after the cards are on screen instead of blocking first paint.
const SensorCharts = lazy(() =>
  import('@/widgets/sensor-charts/ui/SensorCharts').then((m) => ({ default: m.SensorCharts })),
);

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
 * One flat grid, so row heights sync (the tallest cell in a row sets that
 * row's height for every column). On lg: row 1 time + humidity + pressure,
 * row 2 temperature + air quality (two columns), row 3 the gas strip across
 * all three. The card and the strip take the full width on narrower screens.
 */
const summaryGridClass =
  'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-[minmax(240px,300px)_repeat(2,minmax(0,1fr))]';

export function DashboardLayout({ config }: DashboardLayoutProps): React.JSX.Element {
  const latestQuery  = useLatestWeatherQuery(config.key);
  const historyQuery = useWeatherHistoryQuery(config.key);
  const dustDayQuery = useDustDayMeanQuery(config.key);
  useWeatherSocket(config.key);
  const { t } = useTranslation();
  // Development aid: `?time=18:20` pins the time card so every phase of the sky can be reviewed.
  const [searchParams] = useSearchParams();
  const pinnedNow = import.meta.env.DEV ? previewNow(searchParams.get('time'), Date.now()) : undefined;

  const isInitialLoading = latestQuery.isLoading  || historyQuery.isLoading;
  const isError          = latestQuery.isError    || historyQuery.isError;
  // isFetching = true и при initial load, и при background refetch
  const isRefetching     = (latestQuery.isFetching || historyQuery.isFetching) && !isInitialLoading;

  const latest  = latestQuery.data;
  const history = historyQuery.data;
  const measured = useConnectionState(history, latestQuery.isError && latestQuery.data !== undefined);
  // Development aid: `?conn=archive` or `?conn=delayed` shows those states without waiting for the station to go quiet.
  const forced = import.meta.env.DEV ? searchParams.get('conn') : null;
  const forcedAgeMs = forced === 'archive' ? 3 * 3_600_000 + 12 * 60_000 : 4 * 60_000;
  const connection: ConnectionState =
    forced === 'archive' || forced === 'delayed'
      ? { ...measured, level: forced, ageMs: forcedAgeMs, lastSeenMs: Date.now() - forcedAgeMs }
      : measured;

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col">
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
          <ConnectionProvider value={connection}>
          <div className="mt-6 flex flex-1 flex-col gap-6" data-conn={connection.level}>
            <ConnectionBanner connection={connection} />
            <motion.div variants={fadeUp} initial="hidden" animate="visible" className={summaryGridClass}>
              <TimeCard history={history} now={pinnedNow} />
              <HumidityCard value={latest.hum} />
              <PressureCard value={latest.press} history={history} />
              <TemperatureCard source={config.key} temp={latest.temp} history={history} />
              <div className="sm:col-span-2 lg:col-span-2">
                <AirQualityCard source={config.key} history={history} dayMean={dustDayQuery.data} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <GasStrip mq5={latest.mq5} mq3={latest.mq3} />
              </div>
            </motion.div>

            <motion.section
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1, duration: 0.45, ease: 'easeOut' }}
              className="flex-1"
            >
              <Suspense fallback={<SensorChartsSkeleton />}>
                <SensorCharts type={config.key} history={history} isRefetching={isRefetching} />
              </Suspense>
            </motion.section>

            <LiveStreams />
          </div>
          </ConnectionProvider>
        )}
      </div>
    </main>
  );
}
