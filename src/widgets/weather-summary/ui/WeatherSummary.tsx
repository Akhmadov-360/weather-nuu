import { useTranslation } from 'react-i18next';
import { WeatherStatCard } from '@/entities/weather/ui/WeatherStatCard';
import type { WeatherLatest } from '@/entities/weather/model/weather.types';

type WeatherSummaryProps = {
  latest: WeatherLatest;
};

export function WeatherSummary({ latest }: WeatherSummaryProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <WeatherStatCard label={t('lbl_temp')} value={latest.temp} unit="°C" />
      <WeatherStatCard label={t('lbl_hum')} value={latest.hum} unit="%" />
      <WeatherStatCard label={t('lbl_press')} value={latest.press} unit="hPa" />
      <WeatherStatCard label={t('lbl_mq5')} value={latest.mq5} />
      <WeatherStatCard label={t('lbl_mq3')} value={latest.mq3} />
    </section>
  );
}
