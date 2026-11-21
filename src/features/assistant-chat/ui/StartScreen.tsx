import { motion } from 'motion/react';
import { ArrowLeftRight, ArrowUpRight, Activity, Thermometer, Wind, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BlurText from '@/components/ui/blur-text';
import ShinyText from '@/components/ui/shiny-text';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import type { AssistantContext } from '../model/events';

const SUGGESTIONS: { key: string; Icon: LucideIcon }[] = [
  { key: 'assistant_suggest_1', Icon: Thermometer },
  { key: 'assistant_suggest_2', Icon: Wind },
  { key: 'assistant_suggest_3', Icon: Activity },
  { key: 'assistant_suggest_4', Icon: ArrowLeftRight },
];

/** The light follows the pointer over a chip: two variables, no animation loop. */
function followPointer(event: React.PointerEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--mx', `${event.clientX - box.left}px`);
  event.currentTarget.style.setProperty('--my', `${event.clientY - box.top}px`);
}

/** The glowing disc with the assistant's mark: the warm and green of the dashboard, softly lit. */
function Avatar({ calm }: { calm: boolean }): React.JSX.Element {
  return (
    <div className="relative grid h-14 w-14 place-items-center" aria-hidden>
      <span
        className={`absolute inset-0 rounded-full opacity-70 blur-xl [background:radial-gradient(circle_at_30%_30%,#FBBF24,transparent_60%),radial-gradient(circle_at_70%_75%,#34D399,transparent_60%)] ${calm ? '' : 'motion-safe:animate-pulse'}`}
      />
      <span className="relative grid h-12 w-12 place-items-center rounded-full border border-(--ai-border) bg-(--ai-surface) text-(--ai-ink) shadow-lg">
        <Wind className="h-5 w-5" strokeWidth={1.8} />
      </span>
    </div>
  );
}

/**
 * The empty chat: the assistant's mark, a greeting that appears word by word, what data it works from,
 * and four questions to start with. Everything sits in the middle of the panel, not at the bottom.
 */
export function StartScreen({ context, onPick }: { context: AssistantContext; onPick: (question: string, from: HTMLElement) => void }): React.JSX.Element {
  const { t } = useTranslation('assistant');
  const calm = useMediaQuery('(prefers-reduced-motion: reduce)');

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-5 py-6">
      <Avatar calm={calm} />
      <div className="flex flex-col items-center gap-2 text-center">
        <BlurText text={t('assistant_greeting')} animateBy="words" direction="top" delay={90} trigger="load" className="justify-center text-xl leading-snug font-semibold text-(--ai-ink)" />
        <span className="inline-flex items-center gap-2 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          <ShinyText text={t(context === 'street' ? 'assistant_status_street' : 'assistant_status_room')} color="var(--ai-muted)" shineColor="var(--ai-ink)" speed={3.2} />
        </span>
      </div>

      <motion.ul
        className="flex w-full max-w-md flex-col gap-2"
        initial={calm ? false : 'hidden'}
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05, delayChildren: 0.35 } } }}
      >
        {SUGGESTIONS.map(({ key, Icon }) => {
          const question = t(key);
          return (
            <motion.li key={key} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
              <button
                type="button"
                onClick={(event) => onPick(question, event.currentTarget)}
                onPointerMove={followPointer}
                className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-(--ai-border) bg-(--ai-surface) px-3 py-3 text-left text-sm leading-snug text-(--ai-ink) transition-colors [--mx:50%] [--my:50%] hover:border-(--ai-accent)/50 hover:[background-image:radial-gradient(180px_circle_at_var(--mx)_var(--my),color-mix(in_srgb,var(--ai-accent)_16%,transparent),transparent_70%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ai-accent)"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-(--ai-ink)/5 text-(--ai-accent)">
                  <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">{question}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-(--ai-muted) transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-(--ai-ink)" aria-hidden />
              </button>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
