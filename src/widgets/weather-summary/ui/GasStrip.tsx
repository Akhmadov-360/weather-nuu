import { useTranslation } from 'react-i18next';

import { useConnection } from '@/entities/weather/model/connection-context';
import { getSensorStatus } from '@/entities/weather/model/weather-thresholds';
import { SENSOR_RANGES } from '@/shared/lib/weather-ranges';
import { buildZoneGradient } from '@/shared/lib/sensor-format';
import { AnimateNumber } from '@/shared/ui/animate-number';
import { StatusText } from '@/shared/ui/status-text';
import { gasMoteCount } from '../model/gas-motes';
import { useCssColor } from '../model/use-css-color';
import { AgeMark } from './AgeMark';
import { GasMotes } from './GasMotes';

type GasStripProps = {
  mq5: number | null | undefined;
  mq3: number | null | undefined;
};

type TileProps = {
  sensor: 'mq5' | 'mq3';
  label: string;
  note: string;
  value: number | null | undefined;
};

/** Readings at which the motes fill the card: the norm limit for MQ-5, a typical ceiling for the reference-only MQ-3. */
const MOTES_FULL_AT = { mq5: 1000, mq3: 100 } as const;

const DOTTED_TRACK = 'repeating-linear-gradient(to right, var(--text-muted) 0 3px, transparent 3px 8px)';

function Tile({ sensor, label, note, value }: TileProps): React.JSX.Element {
  const { t } = useTranslation();
  const archive = useConnection().level === 'archive';
  const status = getSensorStatus(sensor, value ?? null);
  const range = SENSOR_RANGES[sensor];
  const color = useCssColor(sensor === 'mq5' ? '--sensor-mq5' : '--sensor-mq3', '#D9731A');
  const share = value == null ? 0 : Math.min(1, Math.max(0, (value - range.min) / (range.max - range.min)));
  const gradient = sensor === 'mq5' ? buildZoneGradient(range) : DOTTED_TRACK;

  return (
    <div data-atmosphere-surface className="relative h-full overflow-hidden rounded-card border border-(--glass-border) bg-(--glass-surface) shadow-card">
      {archive ? null : (
        <GasMotes kind={sensor === 'mq5' ? 'ember' : 'bubble'} count={gasMoteCount(value, MOTES_FULL_AT[sensor])} color={color} />
      )}
      <div className="relative z-10 flex h-full flex-col px-4 py-4 sm:p-5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-themed">{label}</div>
          <AgeMark />
        </div>

        <div className="vc-live mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div className="flex items-end gap-1.5">
            <span className="text-4xl leading-none font-semibold tracking-tight text-primary-themed [font-variant-numeric:proportional-nums]">
              {value != null ? <AnimateNumber value={value} fractionDigits={1} /> : '—'}
            </span>
            <span className="pb-0.5 text-base text-muted-themed">ppm</span>
          </div>
          <StatusText tone={status.tone} className="pb-0.5 text-[13px]">
            {t(status.labelKey)}
          </StatusText>
        </div>
        <div className="mt-1.5 text-xs text-muted-themed">{note}</div>

        <div className="vc-live mt-4">
          <div className="relative h-1.5 rounded-full" style={{ background: gradient }}>
            {value != null ? (
              <span
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-(--surface) shadow-sm transition-[left] duration-700"
                style={{ left: `${share * 100}%`, borderColor: sensor === 'mq5' ? color : 'var(--text-secondary)' }}
              />
            ) : null}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted-themed">
            <span>{range.min}</span>
            <span>{t(range.normLabelKey)}</span>
            <span>{range.max}+</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Both gas sensors are uncalibrated estimates: one card each, with a quiet scale and motes that follow the reading. */
export function GasStrip({ mq5, mq3 }: GasStripProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <Tile sensor="mq5" label={t('lbl_mq5')} note={t('gas_estimate_lpg')} value={mq5} />
      <Tile sensor="mq3" label={t('lbl_mq3')} note={t('gas_estimate')} value={mq3} />
    </div>
  );
}
