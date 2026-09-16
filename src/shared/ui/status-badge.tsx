import { cva, type VariantProps } from 'class-variance-authority';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/shared/lib/cn';

/*
 * Only the tone-color layer — shape, focus-ring and base pill styling
 * come from the shadcn Badge underneath instead of being redeclared here.
 */
const toneVariants = cva('px-2.5 py-1 text-[11px] font-medium tracking-wide', {
  variants: {
    tone: {
      good:    'border-status-safe/30     bg-status-safe/10     text-status-safe',
      warn:    'border-status-warning/30  bg-status-warning/10  text-status-warning',
      bad:     'border-status-critical/30 bg-status-critical/10 text-status-critical',
      neutral: 'border-slate-300/40 bg-slate-100/60 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

type StatusBadgeProps = VariantProps<typeof toneVariants> & {
  children: React.ReactNode;
  className?: string;
};

export function StatusBadge({ tone, children, className }: StatusBadgeProps): React.JSX.Element {
  return (
    <Badge variant="outline" className={cn(toneVariants({ tone }), className)}>
      {children}
    </Badge>
  );
}
