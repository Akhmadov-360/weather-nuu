import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/cn';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors',
  {
    variants: {
      tone: {
        good:    'border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400',
        warn:    'border-amber-400/30   bg-amber-400/10   text-amber-600   dark:text-amber-400',
        bad:     'border-rose-400/30    bg-rose-400/10    text-rose-600    dark:text-rose-400',
        neutral: 'border-slate-300/40   bg-slate-100/60   text-slate-600   dark:border-white/10 dark:bg-white/5 dark:text-slate-400',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

type StatusBadgeProps = VariantProps<typeof statusBadgeVariants> & {
  children: React.ReactNode;
  className?: string;
};

export function StatusBadge({ tone, children, className }: StatusBadgeProps): React.JSX.Element {
  return (
    <span className={cn(statusBadgeVariants({ tone }), className)}>
      {children}
    </span>
  );
}
