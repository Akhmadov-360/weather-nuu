import { Skeleton } from "@/components/ui/skeleton";

const TILE_CLASS = "rounded-card border border-[var(--glass-border)] bg-[var(--glass-surface)] p-4 shadow-card backdrop-blur-md";

export function WeatherSummarySkeleton(): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-[minmax(240px,300px)_repeat(2,minmax(0,1fr))] lg:grid-rows-2">
      <div className={TILE_CLASS}>
        <Skeleton className="h-10 w-28 bg-white/10" />
        <Skeleton className="mt-3 h-4 w-20 bg-white/10" />
      </div>
      <div className={TILE_CLASS}>
        <Skeleton className="h-4 w-16 bg-white/10" />
        <Skeleton className="mt-3 h-7 w-20 bg-white/10" />
        <Skeleton className="mt-4 h-2 w-full rounded-full bg-white/10" />
      </div>
      <div className={TILE_CLASS}>
        <Skeleton className="h-4 w-16 bg-white/10" />
        <Skeleton className="mt-3 h-7 w-20 bg-white/10" />
        <Skeleton className="mt-4 h-2 w-full rounded-full bg-white/10" />
      </div>
      <div className={TILE_CLASS}>
        <Skeleton className="h-4 w-24 bg-white/10" />
        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-2xl bg-white/10" />
          <Skeleton className="h-9 w-24 bg-white/10" />
        </div>
      </div>
      <div className={TILE_CLASS}>
        <Skeleton className="h-4 w-16 bg-white/10" />
        <Skeleton className="mt-3 h-7 w-20 bg-white/10" />
        <Skeleton className="mt-4 h-2 w-full rounded-full bg-white/10" />
      </div>
      <div className={TILE_CLASS}>
        <Skeleton className="h-4 w-16 bg-white/10" />
        <Skeleton className="mt-3 h-7 w-20 bg-white/10" />
        <Skeleton className="mt-4 h-2 w-full rounded-full bg-white/10" />
      </div>
    </div>
  );
}
