import { AnimateIcon } from '@animate-ui/react/icons';
import { useTranslation } from 'react-i18next';
import { X } from '@/components/animate-ui/icons/x';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import type { AssistantContext } from '../model/events';
import type { ChatStream } from '../model/use-assistant-chat';
import { AssistantChat } from './AssistantChat';

type AssistantPanelProps = {
  context: AssistantContext;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** For tests; defaults to the real stream. */
  stream?: ChatStream;
};

/**
 * The assistant as a panel: a sheet over the page from the bottom on a phone (full height, drag the handle
 * down to close), a panel on the right from `sm` up. The chat inside forgets the dialogue when the panel
 * is closed: the server keeps nothing, and neither does the page.
 */
export function AssistantPanel({ context, open, onOpenChange, stream }: AssistantPanelProps): React.JSX.Element {
  const { t } = useTranslation('assistant');
  const isPhone = useMediaQuery('(max-width: 639px)');

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isPhone ? 'bottom' : 'right'}>
      <DrawerContent
        className="h-[92dvh] max-h-[92dvh] gap-0 overflow-hidden border-white/10 bg-[#0B1020] p-0 text-[#E8ECF8] data-[vaul-drawer-direction=right]:h-dvh data-[vaul-drawer-direction=right]:max-h-dvh data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:rounded-none data-[vaul-drawer-direction=right]:sm:max-w-md"
      >
        <div className="relative z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0B1020]/80 px-5 py-3 backdrop-blur">
          <div className="min-w-0">
            <DrawerTitle className="text-base font-semibold text-[#E8ECF8]">{t('assistant_title')}</DrawerTitle>
            <DrawerDescription className="sr-only">{t('assistant_placeholder')}</DrawerDescription>
          </div>
          <AnimateIcon animateOnHover asChild>
            <DrawerClose asChild>
              <button
                type="button"
                aria-label={t('assistant_close')}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#8E99B8] transition-colors hover:bg-white/10 hover:text-[#E8ECF8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8FB0DE]"
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
