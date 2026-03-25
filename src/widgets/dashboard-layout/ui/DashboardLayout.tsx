import { useTranslation } from 'react-i18next';
import { useLatestWeatherQuery, useWeatherHistoryQuery } from '@/entities/weather/api/weather.queries';
import type { DashboardPageConfig } from '@/entities/weather/model/weather.types';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { PageLoader } from '@/shared/ui/page-loader';
import { SensorCharts } from '@/widgets/sensor-charts/ui/SensorCharts';
import { TopBar } from '@/widgets/topbar/ui/TopBar';
import { WeatherSummary } from '@/widgets/weather-summary/ui/WeatherSummary';

type DashboardLayoutProps = {
  config: DashboardPageConfig;
};

export function DashboardLayout({ config }: DashboardLayoutProps): React.JSX.Element {
  const latestQuery = useLatestWeatherQuery(config.key);
  const historyQuery = useWeatherHistoryQuery(config.key);
  const { t } = useTranslation();

  if (latestQuery.isLoading || historyQuery.isLoading) {
    return <PageLoader />;
  }

  if (latestQuery.isError || historyQuery.isError) {
    return (
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <TopBar
          titleKey={config.titleKey}
          switchPath={config.oppositePath}
          switchLabelKey={config.oppositeNavKey}
        />
        <div className="mt-6">
          <ErrorState
            message={t('error_data')}
            onRetry={() => {
              void latestQuery.refetch();
              void historyQuery.refetch();
            }}
          />
        </div>
      </div>
    );
  }

  const latest = latestQuery.data;
  const history = historyQuery.data;

  if (!latest || !history || history.length === 0) {
    return (
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <TopBar
          titleKey={config.titleKey}
          switchPath={config.oppositePath}
          switchLabelKey={config.oppositeNavKey}
        />
        <div className="mt-6">
          <EmptyState title={t('empty_title')} description={t('empty_description')} />
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <TopBar
        titleKey={config.titleKey}
        switchPath={config.oppositePath}
        switchLabelKey={config.oppositeNavKey}
      />
      <WeatherSummary latest={latest} />
      <SensorCharts history={history} />
    </main>
  );
}
