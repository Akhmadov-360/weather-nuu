import type { MetricTone } from '@/shared/types/sensor';
import { cn } from '@/shared/lib/cn';

const DOT: Record<MetricTone, string> = {
  good: 'bg-status-safe',
  warn: 'bg-status-warning',
  bad: 'bg-status-critical',
  neutral: 'bg-(--text-muted)',
};

const TEXT: Record<MetricTone, string> = {
  good: 'text-status-safe',
  warn: 'text-status-warning',
  bad: 'text-status-critical',
  neutral: 'text-secondary-themed',
};

/**
 * A status as a dot and text in the status colour: no border, no fill. The
 * filled badge is kept for AQI categories only, so that one stays noticeable.
 */
export function StatusText({
  tone,
  children,
  className,
}: {
  tone: MetricTone;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', TEXT[tone], className)}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT[tone])} aria-hidden />
      {children}
    </span>
  );
}
