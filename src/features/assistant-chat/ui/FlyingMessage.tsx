import { motion } from 'motion/react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Box } from './box';
import { PALETTE, type AssistantTheme } from './palette';

/** If the landing never reports back (hidden tab, an interrupted animation), the real message is shown anyway after this. */
const FAILSAFE_MS = 900;

type FlyingMessageProps = {
  text: string;
  theme: AssistantTheme;
  /** Where the question was typed (the field or the suggestion that was pressed). */
  from: Box;
  /** Where its bubble sits in the dialogue; unknown until the list has drawn it. */
  to: Box | null;
  onDone: () => void;
};

/**
 * The question travels from the field to its place in the dialogue, like in a messenger: a copy of it, in
 * the colours of the bubble, flies over the page while the real bubble waits (invisible) where it will land.
 * It sits in a portal over everything, so it needs its own colours (the panel's variables do not reach it).
 */
export function FlyingMessage({ text, theme, from, to, onDone }: FlyingMessageProps): React.JSX.Element | null {
  useEffect(() => {
    const timer = window.setTimeout(onDone, FAILSAFE_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  if (!to) return null;
  const colors = PALETTE[theme];

  return createPortal(
    <motion.div
      data-flying-message=""
      aria-hidden
      initial={{ ...from, borderRadius: 24, opacity: 0.9 }}
      animate={{ ...to, borderRadius: 16, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
      onAnimationComplete={onDone}
      style={{ position: 'fixed', zIndex: 1000, pointerEvents: 'none', overflow: 'hidden', background: colors.surface, color: colors.ink, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
      className="px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap"
    >
      {text}
    </motion.div>,
    document.body,
  );
}
