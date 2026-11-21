import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import LatticeLoader from '@/components/ui/lattice-loader';
import type { ChatState } from '../model/conversation';
import { Markdown } from './Markdown';
import { ToolChip } from './ToolChip';

const PINNED_PX = 80;

/** The dialogue: the visitor's questions on the right, the assistant's answers as plain text on the left. */
export function MessageList({ state }: { state: ChatState }): React.JSX.Element {
  const { t } = useTranslation('assistant');
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // Follow the answer as it grows, unless the visitor scrolled up to read something.
  const lastText = state.messages.at(-1)?.text.length ?? 0;
  useEffect(() => {
    const el = scroller.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [state.messages.length, lastText, state.tools.length]);

  const lastIndex = state.messages.length - 1;
  const streaming = state.status === 'streaming';

  return (
    <div
      ref={scroller}
      // Dragging inside the list scrolls it; it must not drag the drawer.
      data-vaul-no-drag=""
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      onScroll={(e) => {
        const el = e.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < PINNED_PX;
      }}
      className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4"
    >
      {state.messages.map((message, index) => {
        if (message.role === 'user') {
          return (
            <div key={message.id} className="ml-auto max-w-[85%] rounded-2xl bg-[#131A33] px-4 py-2.5 text-sm leading-relaxed break-words text-[#E8ECF8]">
              {message.text}
            </div>
          );
        }
        const current = index === lastIndex;
        return (
          <div key={message.id} className="flex max-w-full flex-col gap-2 text-sm leading-[1.55] text-[#E8ECF8]">
            {current && state.tools.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {state.tools.map((step) => (
                  <ToolChip key={step.id} step={step} />
                ))}
              </div>
            ) : null}
            {current && streaming && message.text === '' && state.tools.length === 0 ? (
              <LatticeLoader pattern="orbit" grid={3} cellSize={5} gap={2} fontSize={13} showTimer={false} color="var(--season-accent, #8FB0DE)" label={t('assistant_tool_unknown')} />
            ) : null}
            {message.text ? (
              <Markdown
                text={message.text}
                streaming={current && streaming}
                className="break-words [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/30 [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5"
              />
            ) : null}
            {message.interrupted ? <p className="text-xs text-[#8E99B8]">{t('assistant_interrupted')}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
