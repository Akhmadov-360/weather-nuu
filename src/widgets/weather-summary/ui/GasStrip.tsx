import { Flame, Wine } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { getSensorStatus } from '@/entities/weather/model/weather-thresholds';
import { AnimateNumber } from '@/shared/ui/animate-number';
import { StatusBadge } from '@/shared/ui/status-badge';

type GasStripProps = {
  mq5: number | null | undefined;
  mq3: number | null | undefined;
};

type TileProps = {
  icon: React.ElementType;
  label: string;
  note: string;
  value: number | null | undefined;
  badge: React.ReactNode;
};

function Tile({ icon: Icon, label, note, value, badge }: TileProps): React.JSX.Element {
  return (
    <div className="flex h-full items-center gap-4 rounded-card border border-(--glass-border) bg-(--glass-surface) px-4 py-3 shadow-card backdrop-blur-md sm:px-5">
      <div className="shrink-0 rounded-xl border border-(--glass-border) bg-(--glass-surface) p-2 text-secondary-themed">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-themed sm:text-[11px]">{label}</div>
        <div className="mt-1 flex items-end gap-1.5">
          <span className="text-xl font-semibold tracking-tight text-primary-themed">
            {value != null ? <AnimateNumber value={value} fractionDigits={1} /> : '—'}
          </span>
          <span className="pb-[3px] text-xs text-muted-themed">ppm</span>
        </div>
        <div className="mt-0.5 text-[11px] text-muted-themed">{note}</div>
      </div>
      <div className="shrink-0">{badge}</div>
    </div>
  );
}

/** Both gas sensors are uncalibrated estimates, so they get one compact row each: no scale, no legend. */
export function GasStrip({ mq5, mq3 }: GasStripProps): React.JSX.Element {
  const { t } = useTranslation();
  const mq5Status = getSensorStatus('mq5', mq5 ?? null);
  const mq3Status = getSensorStatus('mq3', mq3 ?? null);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <Tile
        icon={Flame}
        label={t('lbl_mq5')}
        note={t('gas_estimate_lpg')}
        value={mq5}
        badge={<StatusBadge tone={mq5Status.tone}>{t(mq5Status.labelKey)}</StatusBadge>}
      />
      <Tile
        icon={Wine}
        label={t('lbl_mq3')}
        note={t('gas_estimate')}
        value={mq3}
        badge={<StatusBadge tone={mq3Status.tone}>{t(mq3Status.labelKey)}</StatusBadge>}
      />
    </div>
  );
}
