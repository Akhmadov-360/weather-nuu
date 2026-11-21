import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StarsBackground } from '@/components/animate-ui/backgrounds/stars';
import PromptBar from '@/components/ui/prompt-bar';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { ERROR_KEYS } from '../model/error-keys';
import { MESSAGE_MAX_CHARS, type AssistantContext, type AssistantLang } from '../model/events';
import { useKeyboardOpen } from '../model/use-keyboard-open';
import { useAssistantChat, type ChatStream } from '../model/use-assistant-chat';
import { toBox, type Box } from './box';
import { FlyingMessage } from './FlyingMessage';
import { MessageList } from './MessageList';
import { PALETTE, paletteStyle, useAssistantTheme } from './palette';
import { StartScreen } from './StartScreen';

function languageOf(code: string): AssistantLang {
  const base = code.slice(0, 2);
  return base === 'ru' || base === 'uz' ? base : 'en';
}

type Flight = { text: string; from: Box; to: Box | null };

type AssistantChatProps = {
  context: AssistantContext;
  /** For tests and the development mock; defaults to the real stream. */
  stream?: ChatStream;
  className?: string;
};

/**
 * The body of the assistant panel: a sky of faint stars, the dialogue (or, while it is empty, the start
 * screen), an error line with "try again", and the question field. A question flies from the field (or the
 * suggestion pressed) to its place in the dialogue. On a phone the keyboard closes after sending, and while
 * it is open the small print is hidden to leave room for the answer.
 */
export function AssistantChat({ context, stream, className }: AssistantChatProps): React.JSX.Element {
  const { t, i18n } = useTranslation('assistant');
  const theme = useAssistantTheme();
  const colors = PALETTE[theme];
  const { state, send, stop, retry } = useAssistantChat({ context, lang: languageOf(i18n.language), stream });
  const keyboardOpen = useKeyboardOpen();
  const calm = useMediaQuery('(prefers-reduced-motion: reduce)');
  const root = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<Flight | null>(null);

  const empty = state.messages.length === 0;
  const streaming = state.status === 'streaming';

  const ask = useCallback(
    (text: string, from?: Element | null) => {
      const message = text.trim().slice(0, MESSAGE_MAX_CHARS);
      if (!message || streaming) return;
      if (!calm && from) setFlight({ text: message, from: toBox(from.getBoundingClientRect()), to: null });
      send(message);
      // After a question the keyboard of a phone only hides the answer. The field takes the focus back by
      // itself right after sending, so this waits a moment.
      if (window.matchMedia('(pointer: coarse)').matches) window.setTimeout(() => (document.activeElement as HTMLElement | null)?.blur(), 0);
    },
    [calm, send, streaming],
  );

  // The bubble is in the list now (hidden): find where it landed so the question can fly there.
  useLayoutEffect(() => {
    if (!flight || flight.to) return;
    const bubble = root.current?.querySelector('[data-last-user]');
    if (bubble) setFlight((f) => (f && !f.to ? { ...f, to: toBox(bubble.getBoundingClientRect()) } : f));
  }, [flight, state.messages.length]);

  const landed = useCallback(() => setFlight(null), []);

  return (
    <div ref={root} style={paletteStyle(theme)} className={cn('relative flex min-h-0 flex-1 flex-col overflow-hidden bg-(--ai-bg) text-(--ai-ink)', className)}>
      <StarsBackground density={0.12} starColor={colors.star} pointerEvents={false} className="absolute inset-0 bg-none opacity-60" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {empty ? <StartScreen context={context} onPick={ask} /> : <MessageList state={state} hideLastQuestion={flight !== null} />}

        {state.status === 'error' && state.error ? (
          <div role="alert" className="mx-5 mb-3 flex items-center justify-between gap-3 rounded-xl border border-(--status-critical,#f87171)/40 bg-(--ai-surface) px-4 py-3 text-sm">
            <span>{t(ERROR_KEYS[state.error])}</span>
            {state.error !== 'disabled' ? (
              <button
                type="button"
                onClick={retry}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-(--ai-accent) transition-colors hover:bg-(--ai-ink)/10 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {t('assistant_retry')}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="px-4 pb-2">
          <PromptBar
            promptLabel={t('assistant_prompt_label')}
            sendLabel={t('assistant_send')}
            stopLabel={t('assistant_stop')}
            placeholder={t(context === 'street' ? 'assistant_placeholder_street' : 'assistant_placeholder_room')}
            sources={[]}
            commands={[]}
            models={[]}
            efforts={[]}
            busy={streaming}
            maxRows={keyboardOpen ? 3 : 5}
            onSend={(text) => ask(text, root.current?.querySelector('textarea'))}
            onStop={stop}
            width={640}
            background={colors.surface}
            menuBackground={colors.surface}
            color={colors.ink}
            sparkColor={colors.accent}
            className="mx-auto"
          />
        </div>

        {keyboardOpen ? null : (
          <p className="px-5 pb-3 text-center text-[11px] leading-snug text-(--ai-muted)">
            <span className="block">{t('assistant_privacy_note')}</span>
            <span className="block">{t('assistant_disclaimer')}</span>
          </p>
        )}
      </div>

      {flight ? <FlyingMessage text={flight.text} theme={theme} from={flight.from} to={flight.to} onDone={landed} /> : null}
    </div>
  );
}
