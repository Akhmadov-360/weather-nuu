import { useTranslation } from 'react-i18next';
import { InfoCard, InfoCardSkeleton } from '@/shared/ui/info-card';
import { InfoHint } from '@/shared/ui/info-hint';
import { useVentilationAdviceQuery } from '../api/ventilation.queries';
import { formatDust, formatRange, verdictTone, type Tone } from '../model/advice';

const DOT: Record<Tone, string> = {
  safe: 'bg-status-safe',
  warning: 'bg-status-warning',
  neutral: 'bg-(--text-muted)',
};

function Stat({ caption, value, note }: { caption: string; value: string; note?: string | null }): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dd className="text-xl leading-none font-semibold tracking-tight text-primary-themed tabular-nums sm:text-2xl">{value}</dd>
      {note ? <p className="mt-1 text-[11px] leading-none text-muted-themed tabular-nums">{note}</p> : null}
      <dt className="mt-1.5 text-[11px] leading-tight text-muted-themed">{caption}</dt>
    </div>
  );
}

/** "40 min" under an hour (to 5 minutes), "2 h" from an hour (to the whole hour). */
function waitText(hours: number, t: (key: string, o: { count: number }) => string): string {
  if (hours < 1) return t('ventilation_wait_min', { count: Math.max(5, Math.round((hours * 60) / 5) * 5) });
  return t('ventilation_wait_h', { count: Math.round(hours) });
}

/**
 * Advice on the window of the auditorium, in the shape of the cards of the sensors: the verdict in large type, the reason
 * under it, the three numbers it stands on. What is not measured is said in the (i) of the card, not on the face of it: the
 * dust outside is a model estimate (the Street kit has no dust sensor), and the speed of air exchange is a literature value
 * until the readings of the room give a measured one. If the request fails the card is not shown: the dashboard works without it.
 */
export function VentilationCard({ enabled }: { enabled: boolean }): React.JSX.Element | null {
  const { t, i18n } = useTranslation('ventilation');
  const query = useVentilationAdviceQuery(enabled);
  const advice = query.data;

  if (!enabled || query.isError || advice === null) return null;
  if (query.isLoading || !advice) return <InfoCardSkeleton />;

  const language = i18n.language;
  const tone = verdictTone(advice.verdict);
  const range = formatRange(advice.predictedRange, language);
  const dash = '—';
  const reason =
    advice.reason === 'forecast_better' && advice.waitHours != null
      ? t('ventilation_reason_forecast_better_hours', {
          lead: t(advice.outside && advice.inside && advice.outside.pm25 < advice.inside.pm25 ? 'ventilation_wait_lead_dirty' : 'ventilation_wait_lead_worse'),
          when: waitText(advice.waitHours, t),
        })
      : t(`ventilation_reason_${advice.reason}`);

  return (
    <InfoCard
      label={t('ventilation_title')}
      hint={
        <InfoHint label={t('ventilation_info_label')}>
          {advice.outside ? (
            <p>
              {t('ventilation_model_note')}{' '}
              <a href={advice.outside.attributionUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {t('ventilation_model_credit')}
              </a>
            </p>
          ) : null}
          {advice.predicted !== null && advice.lambda.source === 'prior' ? <p>{t('ventilation_prior_note')}</p> : null}
          <p>{t('ventilation_disclaimer')}</p>
        </InfoHint>
      }
    >
      <p className="mt-3 text-2xl leading-tight font-semibold tracking-tight text-primary-themed sm:text-[28px]">{t(`ventilation_verdict_${advice.verdict}`)}</p>
      <p className="mt-2 flex gap-2 text-[13px] leading-snug text-secondary-themed">
        <span aria-hidden="true" className={`mt-[7px] size-1.5 shrink-0 rounded-full ${DOT[tone]}`} />
        <span>{reason}</span>
      </p>

      <div className="mt-auto pt-4">
        <p className="text-[11px] text-muted-themed">{t('ventilation_units')}</p>
        <dl className="mt-2 grid grid-cols-3 gap-3">
          <Stat caption={t('ventilation_stat_inside')} value={advice.inside ? formatDust(advice.inside.pm25, language) : dash} />
          <Stat caption={t('ventilation_stat_outside')} value={advice.outside ? formatDust(advice.outside.pm25, language) : dash} />
          <Stat caption={t('ventilation_stat_expected', { minutes: advice.horizonMinutes })} value={advice.predicted !== null ? formatDust(advice.predicted, language) : dash} note={range} />
        </dl>
      </div>
    </InfoCard>
  );
}
