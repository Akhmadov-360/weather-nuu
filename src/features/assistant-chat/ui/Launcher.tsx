import { AnimateIcon } from '@animate-ui/react/icons';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { BotMessageSquare } from '@/components/animate-ui/icons/bot-message-square';
import { ROUTES } from '@/shared/config/routes';
import { useAssistantStatus } from '../api/assistant-status';

// The panel (stars, prompt bar, markdown) is a separate chunk that loads when the visitor first asks for it.
const loadPanel = () => import('./AssistantPanel').then((m) => ({ default: m.AssistantPanel }));
const AssistantPanel = lazy(loadPanel);

/**
 * The round button in the corner that opens the assistant. It exists only when the server says the assistant
 * is on: while that is unknown, when it is off and when the status cannot be read, the page has no button.
 */
export default function Launcher(): React.JSX.Element | null {
  const { t } = useTranslation('assistant');
  const { pathname } = useLocation();
  const status = useAssistantStatus();
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false);

  if (!status.data?.enabled) return null;

  // The page the question is asked from: the street page asks about the street, everything else about the room.
  const context = pathname.startsWith(ROUTES.street) ? 'street' : 'room';

  return (
    <>
      <AnimateIcon animateOnHover asChild>
        <button
          type="button"
          aria-label={t('assistant_open')}
          // Start loading the panel as soon as the visitor reaches for the button.
          onPointerEnter={() => void loadPanel()}
          onFocus={() => void loadPanel()}
          onClick={() => {
            setWanted(true);
            setOpen(true);
          }}
          className="fixed right-4 bottom-4 z-40 grid h-12 w-12 place-items-center rounded-full border border-(--glass-border) bg-(--glass-surface) text-primary-themed shadow-card backdrop-blur transition-colors hover:bg-(--glass-surface-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--status-info) sm:right-6 sm:bottom-6"
        >
          <BotMessageSquare className="h-5 w-5" aria-hidden />
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
