import { TypingText } from '@animate-ui/react/primitives/texts/typing';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';

const KEYS = ['assistant_suggest_1', 'assistant_suggest_2', 'assistant_suggest_3', 'assistant_suggest_4'] as const;

/**
 * The empty chat: a greeting and a few questions to start with. The greeting is typed out once, unless the
 * visitor asks for less motion: then it is just there.
 */
export function Suggestions({ onPick }: { onPick: (question: string) => void }): React.JSX.Element {
  const { t } = useTranslation('assistant');
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const greeting = t('assistant_greeting');

  return (
    <div className="flex flex-1 flex-col justify-end gap-5 px-5 pb-4">
      <p className="text-lg leading-snug font-semibold text-[#E8ECF8]">
        {reduceMotion ? greeting : <TypingText text={greeting} duration={45} />}
      </p>
      <ul className="flex flex-col gap-2">
        {KEYS.map((key) => {
          const question = t(key);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onPick(question)}
                className="w-full rounded-xl border border-white/10 bg-[#131A33]/80 px-4 py-3 text-left text-sm leading-snug text-[#E8ECF8] transition-colors hover:bg-[#1B2547] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--season-accent,#8FB0DE)"
              >
                {question}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
