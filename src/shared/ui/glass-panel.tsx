import { cn } from '@/shared/lib/cn';

type GlassPanelProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Основной surface-контейнер dashboard.
 * border-radius, shadow и цвета — через CSS vars,
 * чтобы корректно адаптироваться к dark/light теме.
 * border-radius задаётся inline (не через Tailwind токен)
 * для гарантированного применения поверх сбросов.
 */
export function GlassPanel({ children, className }: GlassPanelProps): React.JSX.Element {
  return (
    <div
      className={cn('border backdrop-blur-xl', className)}
      style={{
        borderRadius: '24px',
        backgroundColor: 'var(--glass-surface)',
        borderColor: 'var(--glass-border)',
        boxShadow: 'var(--panel-shadow)',
      }}
    >
      {children}
    </div>
  );
}
