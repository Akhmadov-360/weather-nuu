import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';

/** A wide screen with a mouse: the hint opens on hover and on keyboard focus. Anything else (a phone, a tablet, a touch screen): on a tap. */
export const HOVER_QUERY = '(min-width: 640px) and (hover: hover) and (pointer: fine)';

type InfoHintProps = {
  /** What the button is for, for a screen reader (the icon alone says nothing). */
  label: string;
  children: React.ReactNode;
};

/**
 * The small (i) of a card with the notes that must be available but need not be read every time: where a number comes
 * from, what is not measured. A tooltip where there is a mouse, a popover where there is a finger. The button is 16 px
 * to the eye and 44 px to the finger: its hit area is larger than the icon and does not move the layout.
 */
export function InfoHint({ label, children }: InfoHintProps): React.JSX.Element {
  const hover = useMediaQuery(HOVER_QUERY);
  const trigger = (
    <button
      type="button"
      aria-label={label}
      className="-mt-3.5 -mr-3.5 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-muted-themed transition-colors hover:text-primary-themed focus-visible:text-primary-themed focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-(--text-muted) data-[state=open]:text-primary-themed"
    >
      <Info aria-hidden="true" className="size-4" />
    </button>
  );

  if (hover) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="bottom" align="end" sideOffset={2} className="block max-w-[min(20rem,calc(100vw-2rem))] space-y-1.5 px-3 py-2 text-left text-xs leading-snug">
          {children}
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] gap-1.5 border border-(--glass-border) bg-(--surface) p-3 text-xs leading-snug text-secondary-themed">
        {children}
      </PopoverContent>
    </Popover>
  );
}
