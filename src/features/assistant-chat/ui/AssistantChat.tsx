import { useTranslation } from 'react-i18next';
import { StarsBackground } from '@/components/animate-ui/backgrounds/stars';
import PromptBar from '@/components/ui/prompt-bar';
import { cn } from '@/lib/utils';
import { ERROR_KEYS } from '../model/error-keys';
import type { AssistantContext, AssistantLang } from '../model/events';
import { useAssistantChat, type ChatStream } from '../model/use-assistant-chat';
import { MessageList } from './MessageList';
import { Suggestions } from './Suggestions';

const ACCENT = 'var(--season-accent, #8FB0DE)';

function languageOf(code: string): AssistantLang {
  const base = code.slice(0, 2);
  return base === 'ru' || base === 'uz' ? base : 'en';
}

type AssistantChatProps = {
  context: AssistantContext;
  /** For tests and the development mock; defaults to the real stream. */
  stream?: ChatStream;
  className?: string;
};

/**
 * The body of the assistant panel: a night sky of faint stars, the dialogue (or, while it is empty, a greeting
 * and some questions to start with), an error line with "try again", and the question field. Always dark,
 * in both themes: the stars need it, and the contrast is then the same everywhere.
 */
export function AssistantChat({ context, stream, className }: AssistantChatProps): React.JSX.Element {
  const { t, i18n } = useTranslation('assistant');
  const { state, send, stop, retry } = useAssistantChat({ context, lang: languageOf(i18n.language), stream });
  const empty = state.messages.length === 0;
  const streaming = state.status === 'streaming';

  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0B1020] text-[#E8ECF8]', className)}>
      <StarsBackground density={0.12} starColor="#8E99B8" pointerEvents={false} className="absolute inset-0 bg-none opacity-60" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {empty ? <Suggestions onPick={send} /> : <MessageList state={state} />}

        {state.status === 'error' && state.error ? (
          <div role="alert" className="mx-5 mb-3 flex items-center justify-between gap-3 rounded-xl border border-(--status-critical,#f87171)/40 bg-[#131A33] px-4 py-3 text-sm">
            <span>{t(ERROR_KEYS[state.error])}</span>
            {state.error !== 'disabled' ? (
              <button
                type="button"
                onClick={retry}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: ACCENT }}
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
            placeholder={t('assistant_placeholder')}
            sources={[]}
            commands={[]}
            models={[]}
            efforts={[]}
            busy={streaming}
            onSend={(text) => send(text)}
            onStop={stop}
            width={640}
            background="#131A33"
            menuBackground="#131A33"
            color="#E8ECF8"
            sparkColor="#8FB0DE"
            className="mx-auto"
          />
        </div>

        <p className="px-5 pb-3 text-center text-[11px] leading-snug text-[#8E99B8]">
          <span className="block">{t('assistant_privacy_note')}</span>
          <span className="block">{t('assistant_disclaimer')}</span>
        </p>
      </div>
    </div>
  );
}
