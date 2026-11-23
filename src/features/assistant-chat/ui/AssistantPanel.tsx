import { AnimateIcon } from '@animate-ui/react/icons';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from '@/components/animate-ui/icons/x';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { useVisualViewportBox } from '@/shared/hooks/useVisualViewportBox';
import type { AssistantContext } from '../model/events';
import type { ChatStream } from '../model/use-assistant-chat';
import { AirOrb } from './AirOrb';
import { AssistantChat } from './AssistantChat';
import { paletteStyle, useAssistantTheme } from './palette';
import { useAirTone } from './use-air-tone';

type AssistantPanelProps = {
  context: AssistantContext;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** For tests; defaults to the real stream. */
  stream?: ChatStream;
};

/**
 * The assistant as a panel: a sheet over the page from the bottom on a phone (the whole visible height, drag the handle
 * down to close), a panel on the right from `sm` up. It follows the theme of the page, dark or light. The
 * chat inside forgets the dialogue when the panel is closed: the server keeps nothing, and neither does the page.
 */
export function AssistantPanel({ context, open, onOpenChange, stream }: AssistantPanelProps): React.JSX.Element {
  const { t } = useTranslation('assistant');
  const isPhone = useMediaQuery('(max-width: 639px)');
  // On a phone the sheet takes exactly what is visible: with the keyboard up it ends above the keyboard, with the keyboard down it
  // reaches the bottom edge, so no strip of the page is left under it (the sheet is not fixed to the layout viewport).
  const box = useVisualViewportBox(isPhone && open);
  const theme = useAssistantTheme();
  const tone = useAirTone();

  // The falling leaves and the rest of the scene are hidden behind the panel on a phone while it is open: they
  // would only compete with it for the GPU, and show through it while it slides away. They come back once it is gone.
  const release = useRef<number>(undefined);
  useEffect(() => {
    window.clearTimeout(release.current);
    if (open) document.documentElement.dataset.assistantOpen = '';
    else release.current = window.setTimeout(() => delete document.documentElement.dataset.assistantOpen, 450);
  }, [open]);
  useEffect(
    () => () => {
      window.clearTimeout(release.current);
      delete document.documentElement.dataset.assistantOpen;
    },
    [],
  );

  return (
    // The library moves the sheet for the keyboard by itself and, on an iPhone, leaves it a strip above the bottom edge when the keyboard goes: the box above does that job.
    <Drawer open={open} onOpenChange={onOpenChange} direction={isPhone ? 'bottom' : 'right'} repositionInputs={false}>
      <DrawerContent
        style={{ ...paletteStyle(theme), ...(isPhone && box ? { top: box.top, height: box.height, maxHeight: box.height, bottom: 'auto' } : null) }}
        className="h-dvh max-h-dvh gap-0 overflow-hidden border-(--ai-border) bg-(--ai-bg) p-0 text-(--ai-ink) data-[vaul-drawer-direction=right]:h-dvh data-[vaul-drawer-direction=right]:max-h-dvh data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:rounded-none data-[vaul-drawer-direction=right]:sm:max-w-md"
      >
        <div className="relative z-20 flex items-center justify-between gap-3 border-b border-(--ai-border) bg-(--ai-bg)/80 px-5 py-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <AirOrb size={28} tone={tone} />
            <DrawerTitle className="text-base font-semibold text-(--ai-ink)">{t('assistant_title')}</DrawerTitle>
            <DrawerDescription className="sr-only">{t(context === 'street' ? 'assistant_placeholder_street' : 'assistant_placeholder_room')}</DrawerDescription>
          </div>
          <AnimateIcon animateOnHover asChild>
            <DrawerClose asChild>
              <button
                type="button"
                aria-label={t('assistant_close')}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-(--ai-muted) transition-colors hover:bg-(--ai-ink)/10 hover:text-(--ai-ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ai-accent)"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </DrawerClose>
          </AnimateIcon>
        </div>
        {/* Mounted only while open: closing the panel ends the conversation and its request. */}
        {open ? <AssistantChat context={context} stream={stream} /> : null}
      </DrawerContent>
    </Drawer>
  );
}
