import { cn } from '@/shared/lib/cn';

type GlassPanelProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Основной surface-контейнер dashboard.
 * Цвета и радиус — через Tailwind-токены (rounded-panel, shadow-panel из
 * tailwind.config.ts) и CSS-переменные (--glass-surface/--glass-border из
 * globals.css), а не inline style — так тема и масштаб радиуса остаются
 * едиными на уровне конфига, а не разбросаны по компонентам.
 */
export function GlassPanel({ children, className }: GlassPanelProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-panel border border-[var(--glass-border)] bg-[var(--glass-surface)] shadow-panel backdrop-blur-xl',
        className,
      )}
    >
      {children}
    </div>
  );
}
