import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import RubberSegment from '@/components/ui/rubber-segment';
import type { Level } from '@/entities/atmosphere/model/tier';
import { useAtmosphereState } from '../model/atmosphere-context';

const LEVELS: Level[] = ['full', 'calm', 'off'];

/**
 * The scene's switch: a header button that opens three levels. Until the user
 * picks one, the level is automatic and a hint says if the device lowered it.
 */
export function AtmosphereControl(): React.JSX.Element | null {
  const { t } = useTranslation();
  const atmosphere = useAtmosphereState();
  if (!atmosphere) return null;
  const { level, userChoice, limitedBy, setUserChoice } = atmosphere;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('atm_title')}
          title={t('atm_title')}
          className="h-10 w-10 rounded-full text-primary-themed transition-colors hover:bg-(--control-hover) sm:h-9 sm:w-9"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(18rem,calc(100vw-2rem))] border border-(--glass-border) bg-(--surface) p-3">
        <div className="text-sm font-medium text-primary-themed">{t('atm_title')}</div>
        <RubberSegment
          aria-label={t('atm_title')}
          items={LEVELS.map((value) => ({ value, label: t(`atm_level_${value}`) }))}
          value={level}
          onChange={(next) => setUserChoice(next as Level)}
          draggable={false}
          size="md"
          radius={12}
          inset={3}
          trackColor="var(--glass-surface-soft)"
          thumbColor="var(--control-active)"
          textColor="var(--text-muted)"
          activeTextColor="var(--text-primary)"
          className="w-full border border-(--glass-border)"
        />
        <p className="text-xs leading-snug text-muted-themed">{t(`atm_hint_${level}`)}</p>
        {userChoice === null && limitedBy ? (
          <p className="text-xs leading-snug text-secondary-themed">{t(limitedBy === 'device' ? 'atm_auto_device' : 'atm_auto_governor')}</p>
        ) : null}
        {userChoice !== null ? (
          <button
            type="button"
            onClick={() => setUserChoice(null)}
            className="w-fit rounded-md px-1 text-xs font-medium text-(--status-info) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--status-info)"
          >
            {t('atm_auto_reset')}
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
