import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';

type TimeDisplayProps = {
  isLoading?: boolean;
};

export function TimeDisplay({ isLoading = false }: TimeDisplayProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const time = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now),
    [i18n.language, now],
  );

  const date = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      }).format(now),
    [i18n.language, now],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-40 rounded-xl bg-white/10" />
        <Skeleton className="h-6 w-28 rounded-lg bg-white/10" />
        <Skeleton className="h-5 w-16 rounded-lg bg-white/10" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="text-5xl font-semibold tracking-tight text-primary-themed sm:text-6xl">
          {time}
        </div>
        <div className="mt-2 text-sm uppercase tracking-[0.28em] text-secondary-themed sm:text-base">
          {date}
        </div>
      </div>

      <div className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-glow" />
        {t('live')}
      </div>
    </div>
  );
}
