import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { pressureTendency, type TendencyKind } from '@/entities/weather/model/pressure-tendency';
import type { WeatherHistoryItem } from '@/entities/weather/model/weather.types';
import { isobarRings } from '../model/isobars';

type PressureCardProps = {
  value: number | null | undefined;
  history: WeatherHistoryItem[];
};

const CX = 170;
const CY = 170;
const POINTS = 56;

/** A closed, slightly irregular ring; the wobble depends only on the level, so it is stable between renders. */
function blobPath(radius: number, seed: number): string {
  let d = '';
  for (let i = 0; i <= POINTS; i++) {
    const a = (i / POINTS) * Math.PI * 2;
    const r = radius * (1 + 0.05 * Math.sin(3 * a + seed * 0.07) + 0.035 * Math.cos(2 * a - seed * 0.11));
    d += `${i === 0 ? 'M' : 'L'}${(CX + r * Math.cos(a)).toFixed(1)} ${(CY + r * Math.sin(a)).toFixed(1)} `;
  }
  return `${d}Z`;
}

const formatValue = (v: number) => v.toFixed(1).replace('.', ',');
const formatDelta = (d: number) => `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d).toFixed(1).replace('.', ',')}`;

function directionOf(kind: TendencyKind): 'up' | 'down' | 'flat' {
  if (kind.startsWith('rising')) return 'up';
  if (kind.startsWith('falling')) return 'down';
  return 'flat';
}

/**
 * Pressure as isobars: a ring every 10 hPa (higher pressure nearer the centre),
 * the ring of the current value emphasised and numbered, a dashed ring where
 * the pressure stood three hours ago. Ripples run outward when it rises and
 * inward when it falls, faster for bigger changes, and stop when it is steady,
 * so the motion is the tendency, not decoration.
 */
export function PressureCard({ value, history }: PressureCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const tendency = useMemo(() => pressureTendency(history, Date.now()), [history]);
  const geometry = useMemo(
    () => (value == null || Number.isNaN(value) ? null : isobarRings(value, tendency?.delta ?? null)),
    [value, tendency],
  );
  const paths = useMemo(() => (geometry ? geometry.rings.map((ring) => ({ ...ring, d: blobPath(ring.r, ring.level) })) : []), [geometry]);

  const direction = tendency ? directionOf(tendency.kind) : 'flat';
  const Arrow = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : ArrowRight;
  const rippleSeconds = tendency ? Math.min(16, Math.max(4, 24 / Math.max(1, Math.abs(tendency.delta)))) : 0;
  const rippling = tendency !== null && tendency.kind !== 'steady';
  const unit = t('unit_hpa');

  const current = geometry?.current;
  const stationAngle = (-40 * Math.PI) / 180;

  return (
    <div className="relative h-full min-h-[236px] overflow-hidden rounded-card border border-(--glass-border) bg-(--glass-surface) shadow-card sm:min-h-[250px]">
      {geometry ? (
        <svg
          className="press-isobars pointer-events-none absolute -right-8 top-1/2 h-[330px] w-[330px] -translate-y-1/2 sm:right-0 sm:h-[360px] sm:w-[360px]"
          viewBox="0 0 340 340"
          aria-hidden
        >
          {paths.map((ring) => (
            <path
              key={ring.level}
              d={ring.d}
              fill="none"
              stroke="var(--sensor-press)"
              strokeWidth={1}
              opacity={ring.level === current?.level ? 0 : 0.26}
            >
              <title>{t('press_ring_title', { level: ring.level })}</title>
            </path>
          ))}

          {rippling
            ? [0, 1, 2].map((i) => (
                <path
                  key={`ripple-${i}`}
                  className="press-ripple"
                  d={blobPath(150, 7)}
                  fill="none"
                  stroke="var(--sensor-press)"
                  strokeWidth={1.4}
                  style={{
                    transformOrigin: `${CX}px ${CY}px`,
                    animation: `press-ripple ${rippleSeconds}s linear ${(-i * rippleSeconds) / 3}s infinite ${direction === 'down' ? 'reverse' : 'normal'}`,
                    opacity: 0,
                  }}
                />
              ))
            : null}

          {geometry.previous ? (
            <path
              d={blobPath(geometry.previous.r, geometry.previous.level)}
              fill="none"
              stroke="var(--sensor-press)"
              strokeWidth={1.4}
              strokeDasharray="4 5"
              opacity={0.7}
            >
              <title>{t('press_prev_title', { value: formatValue(geometry.previous.level) })}</title>
            </path>
          ) : null}

          {current ? (
            <>
              <path
                d={blobPath(current.r, current.level)}
                fill="none"
                stroke="var(--sensor-press)"
                strokeWidth={2.4}
                strokeLinecap="round"
              >
                <title>{t('press_now_title', { value: value == null ? '' : formatValue(value) })}</title>
              </path>
              <circle
                cx={CX + current.r * Math.cos(stationAngle)}
                cy={CY + current.r * Math.sin(stationAngle)}
                r={5.5}
                fill="var(--surface)"
                stroke="var(--sensor-press)"
                strokeWidth={2.4}
              />
            </>
          ) : null}

          {/* Ring numbers on the upward ray, where neighbouring rings are far enough apart (about 23 units) to be read; rings that leave the card get none */}
          {paths
            .filter((ring) => ring.labelled && ring.r <= 112 && Math.abs(ring.r - (current?.r ?? -99)) > 14)
            .map((ring) => (
              <text key={`label-${ring.level}`} x={CX + 5} y={CY - ring.r + 3.5} fontSize={10} fill="var(--text-muted)">
                {ring.level}
              </text>
            ))}
          {current && current.r <= 118 ? (
            <text x={CX + 5} y={CY - current.r + 3.5} fontSize={11} fontWeight={600} fill="var(--text-primary)">
              {Math.round(current.level)}
            </text>
          ) : null}
        </svg>
      ) : null}

      <div className="relative z-10 flex h-full flex-col p-4 sm:p-5">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-themed">{t('lbl_press')}</div>
        <div className="mt-2 text-[44px] leading-none font-semibold tracking-tight text-primary-themed [font-variant-numeric:proportional-nums] sm:text-5xl">
          {value == null ? '—' : formatValue(value)}
          <span className="ml-1 text-base font-normal tracking-normal text-muted-themed">{unit}</span>
        </div>

        <div className="mt-2.5 flex items-center gap-1.5 text-[13px] font-medium text-secondary-themed">
          {tendency ? (
            <>
              <Arrow className="h-4 w-4 shrink-0 text-(--sensor-press)" strokeWidth={2.4} aria-hidden />
              {t(`press_trend_${tendency.kind}`)}
            </>
          ) : (
            t('press_trend_unknown')
          )}
        </div>
        {tendency ? (
          <div className="mt-0.5 text-xs text-muted-themed">{t('press_delta_3h', { value: formatDelta(tendency.delta) })}</div>
        ) : null}

        <div className="mt-auto pt-3 text-xs text-muted-themed">
          <div>{t('press_norm')}</div>
          <div className="mt-0.5 max-w-[16rem]">{t('press_iso_caption')}</div>
        </div>
      </div>
    </div>
  );
}
