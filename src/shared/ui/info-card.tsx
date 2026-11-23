import { useId } from 'react';
import { cn } from '@/shared/lib/cn';

type InfoCardProps = {
  /** The small caption of the card, as on the cards of the sensors (capitals, light). */
  label: string;
  /** The (i) in the corner, see `InfoHint`. */
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * The shell of a card that is not a sensor (the advice, the events): the same surface, radius, shadow and padding as the
 * cards of the sensors, the caption in the same small capitals, the same minimum height, so that it reads as one of them.
 */
export function InfoCard({ label, hint, children, className }: InfoCardProps): React.JSX.Element {
  const titleId = useId();
  return (
    <section
      data-atmosphere-surface
      aria-labelledby={titleId}
      className={cn(
        'relative flex h-full min-h-[236px] flex-col overflow-hidden rounded-card border border-(--glass-border) bg-(--glass-surface) px-4 py-4 shadow-card sm:min-h-[250px] sm:p-5',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <h3 id={titleId} className="text-[11px] uppercase tracking-[0.14em] text-muted-themed">
          {label}
        </h3>
        {hint}
      </header>
      {children}
    </section>
  );
}

/** The placeholder while a card loads: the shell with the same size, so that the page does not jump. */
export function InfoCardSkeleton(): React.JSX.Element {
  return <div aria-hidden="true" className="h-full min-h-[236px] animate-pulse rounded-card border border-(--glass-border) bg-(--glass-surface) shadow-card sm:min-h-[250px]" />;
}
