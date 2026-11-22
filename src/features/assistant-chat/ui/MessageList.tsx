import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import LatticeLoader from '@/components/ui/lattice-loader';
import type { ChatState } from '../model/conversation';
import { Markdown } from './Markdown';
import { Sources } from './Sources';
import { ToolChip } from './ToolChip';

const PINNED_PX = 80;

/** The dialogue: the visitor's questions on the right, the assistant's answers as plain text on the left. */
export function MessageList({ state, hideLastQuestion = false }: { state: ChatState; hideLastQuestion?: boolean }): React.JSX.Element {
  const { t } = useTranslation('assistant');
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // Follow the answer as it grows, unless the visitor scrolled up to read something. A layout effect: the
  // flying question measures where its bubble landed after this has scrolled.
  const lastText = state.messages.at(-1)?.text.length ?? 0;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [state.messages.length, lastText, state.tools.length]);

  const lastIndex = state.messages.length - 1;
  const lastQuestionIndex = state.messages.map((m) => m.role).lastIndexOf('user');
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
          const last = index === lastQuestionIndex;
          return (
            <div
              key={message.id}
              data-last-user={last ? '' : undefined}
              style={last && hideLastQuestion ? { opacity: 0 } : undefined}
              className="ml-auto max-w-[85%] rounded-2xl bg-(--ai-surface) px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-(--ai-ink)"
            >
              {message.text}
            </div>
          );
        }
        const current = index === lastIndex;
        return (
          <div key={message.id} className="flex max-w-full flex-col gap-2 text-sm leading-[1.55] text-(--ai-ink)">
            {message.tool ? <ToolChip step={message.tool} /> : null}
            {current && streaming && message.text === '' && !message.tool ? (
              <LatticeLoader status="working" pattern="orbit" grid={3} cellSize={5} gap={2} fontSize={13} showTimer={false} color="var(--ai-accent)" label={t('assistant_thinking')} />
            ) : null}
            {message.text ? (
              <Markdown
                text={message.text}
                streaming={current && streaming}
                className="break-words [&_code]:rounded [&_code]:bg-(--ai-ink)/10 [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-(--ai-ink)/10 [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5"
              />
            ) : null}
            {message.sources?.length ? <Sources items={message.sources} /> : null}
            {message.interrupted ? <p className="text-xs text-(--ai-muted)">{t('assistant_interrupted')}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
