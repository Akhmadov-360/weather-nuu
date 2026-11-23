import { CircleCheck, CircleHelp, Clock, DoorClosed, DoorOpen, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassPanel } from '@/shared/ui/glass-panel';
import { useVentilationAdviceQuery } from '../api/ventilation.queries';
import { formatDust, formatRange, verdictTone, type Tone, type Verdict } from '../model/advice';

const ICONS: Record<Verdict, LucideIcon> = {
  open: DoorOpen,
  dont_open: DoorClosed,
  wait: Clock,
  not_needed: CircleCheck,
  unknown: CircleHelp,
};

const TONE_COLOR: Record<Tone, string> = {
  safe: 'var(--status-safe)',
  warning: 'var(--status-warning)',
  neutral: 'currentColor',
};

/**
 * Advice on the window of the auditorium. The verdict first, then the reason, then the numbers it stands on. It says
 * plainly what is not measured: the dust outside is a model estimate (the Street kit has no dust sensor), and the
 * speed of air exchange is a literature value until the readings of the room give a measured one. If the request fails,
 * the card is not shown: the dashboard works without it.
 */
export function VentilationCard({ enabled }: { enabled: boolean }): React.JSX.Element | null {
  const { t, i18n } = useTranslation('ventilation');
  const query = useVentilationAdviceQuery(enabled);
  const advice = query.data;

  if (!enabled || query.isError || advice === null) return null;
  if (query.isLoading || !advice) return <GlassPanel className="h-32 animate-pulse p-4">{null}</GlassPanel>;

  const Icon = ICONS[advice.verdict];
  const language = i18n.language;
  const range = formatRange(advice.predictedRange, language);
  return (
    <GlassPanel className="p-4">
      <section aria-labelledby="ventilation-title">
        <h3 id="ventilation-title" className="text-sm text-secondary-themed">
          {t('ventilation_title')}
        </h3>
        <div className="mt-2 flex items-start gap-3">
          <span className="mt-0.5 shrink-0" style={{ color: TONE_COLOR[verdictTone(advice.verdict)] }}>
            <Icon aria-hidden="true" className="size-7" />
          </span>
          <div className="min-w-0">
            <p className="text-lg leading-tight font-medium">{t(`ventilation_verdict_${advice.verdict}`)}</p>
            <p className="mt-1 text-sm text-secondary-themed">{t(`ventilation_reason_${advice.reason}`)}</p>
          </div>
        </div>

        {advice.inside || advice.outside ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {advice.inside ? (
              <>
                <dt className="text-secondary-themed">{t('ventilation_inside')}</dt>
                <dd className="text-right tabular-nums">{formatDust(advice.inside.pm25, language)}</dd>
              </>
            ) : null}
            {advice.outside ? (
              <>
                <dt className="text-secondary-themed">{t('ventilation_outside_model')}</dt>
                <dd className="text-right tabular-nums">{formatDust(advice.outside.pm25, language)}</dd>
              </>
            ) : null}
            {advice.predicted !== null ? (
              <>
                <dt className="text-secondary-themed">{t('ventilation_expected', { minutes: advice.horizonMinutes })}</dt>
                <dd className="text-right tabular-nums">
                  {formatDust(advice.predicted, language)}
                  {range ? <span className="text-secondary-themed"> ({range})</span> : null}
                </dd>
              </>
            ) : null}
          </dl>
        ) : null}

        <div className="mt-3 space-y-1 text-xs text-secondary-themed">
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
        </div>
      </section>
    </GlassPanel>
  );
}
