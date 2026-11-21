import { AnimateIcon } from '@animate-ui/react/icons';
import { motion } from 'motion/react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { BotMessageSquare } from '@/components/animate-ui/icons/bot-message-square';
import { ROUTES } from '@/shared/config/routes';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { useAssistantStatus } from '../api/assistant-status';

// The panel (stars, prompt bar, markdown) is a separate chunk that loads when the visitor first asks for it.
const loadPanel = () => import('./AssistantPanel').then((m) => ({ default: m.AssistantPanel }));
const AssistantPanel = lazy(loadPanel);

/** The greeting slides out this long after the page opens, stays this long, and slides back into the icon. */
export const TEASER_DELAY_MS = 1500;
export const TEASER_HOLD_MS = 5000;
export const TEASER_SEEN_KEY = 'assistant-teaser-seen';

// The page may be unable to keep a note (private mode, blocked storage): then the greeting just shows each time.
function wasSeen(): boolean {
  try {
    return sessionStorage.getItem(TEASER_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
function markSeen(): void {
  try {
    sessionStorage.setItem(TEASER_SEEN_KEY, '1');
  } catch {
    // Nothing to do: it will simply show again next time.
  }
}

/**
 * The round button in the corner that opens the assistant. It exists only when the server says the assistant
 * is on: while that is unknown, when it is off and when the status cannot be read, the page has no button.
 * Once per visit, a moment after the page opens, it slides out into a pill with "Ask the smart assistant"
 * and slides back into the icon (not for those who asked for less motion).
 */
export default function Launcher(): React.JSX.Element | null {
  const { t } = useTranslation('assistant');
  const { pathname } = useLocation();
  const status = useAssistantStatus();
  const calm = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const enabled = Boolean(status.data?.enabled);

  useEffect(() => {
    if (!enabled || calm || wasSeen()) return;
    const show = window.setTimeout(() => setTeaser(true), TEASER_DELAY_MS);
    const hide = window.setTimeout(() => {
      setTeaser(false);
      markSeen();
    }, TEASER_DELAY_MS + TEASER_HOLD_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [enabled, calm]);

  if (!enabled) return null;

  // The page the question is asked from: the street page asks about the street, everything else about the room.
  const context = pathname.startsWith(ROUTES.street) ? 'street' : 'room';

  return (
    <>
      <AnimateIcon animateOnHover asChild>
        <button
          type="button"
          aria-label={t('assistant_open')}
          data-teaser={teaser ? 'open' : 'closed'}
          // Start loading the panel as soon as the visitor reaches for the button.
          onPointerEnter={() => void loadPanel()}
          onFocus={() => void loadPanel()}
          onClick={() => {
            setTeaser(false);
            markSeen();
            setWanted(true);
            setOpen(true);
          }}
          className="fixed right-4 bottom-4 z-40 flex h-12 items-center overflow-hidden rounded-full border border-(--glass-border) bg-(--glass-surface) text-primary-themed shadow-card backdrop-blur transition-colors hover:bg-(--glass-surface-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--status-info) sm:right-6 sm:bottom-6"
        >
          <motion.span
            aria-hidden="true"
            className="block overflow-hidden whitespace-nowrap text-sm font-medium"
            initial={false}
            animate={teaser ? { width: 'auto', opacity: 1, paddingLeft: 18 } : { width: 0, opacity: 0, paddingLeft: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          >
            {t('assistant_teaser')}
          </motion.span>
          <span className="grid h-12 w-12 shrink-0 place-items-center">
            <BotMessageSquare className="h-5 w-5" aria-hidden />
          </span>
        </button>
      </AnimateIcon>
      {wanted ? (
        <Suspense fallback={null}>
          <AssistantPanel context={context} open={open} onOpenChange={setOpen} />
        </Suspense>
      ) : null}
    </>
  );
}
