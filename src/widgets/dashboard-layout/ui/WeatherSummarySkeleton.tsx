import { Skeleton } from "@/components/ui/skeleton";

const TILE_CLASS = "rounded-card border border-(--glass-border) bg-(--glass-surface) p-4 shadow-card";

export function WeatherSummarySkeleton(): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-[minmax(240px,300px)_repeat(2,minmax(0,1fr))]">
      <div className={TILE_CLASS}>
        <Skeleton className="h-10 w-28 bg-(--control-track)" />
        <Skeleton className="mt-3 h-4 w-20 bg-(--control-track)" />
      </div>
      <div className={TILE_CLASS}>
        <Skeleton className="h-4 w-16 bg-(--control-track)" />
        <Skeleton className="mt-3 h-7 w-20 bg-(--control-track)" />
        <Skeleton className="mt-4 h-2 w-full rounded-full bg-(--control-track)" />
      </div>
      <div className={TILE_CLASS}>
        <Skeleton className="h-4 w-16 bg-(--control-track)" />
        <Skeleton className="mt-3 h-7 w-20 bg-(--control-track)" />
        <Skeleton className="mt-4 h-2 w-full rounded-full bg-(--control-track)" />
      </div>
      <div className={TILE_CLASS}>
        <Skeleton className="h-4 w-24 bg-(--control-track)" />
        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-2xl bg-(--control-track)" />
          <Skeleton className="h-9 w-24 bg-(--control-track)" />
        </div>
      </div>
      <div className={`${TILE_CLASS} sm:col-span-2 lg:col-span-2`}>
        <Skeleton className="h-4 w-24 bg-(--control-track)" />
        <Skeleton className="mt-3 h-10 w-40 bg-(--control-track)" />
        <Skeleton className="mt-4 h-2 w-full rounded-full bg-(--control-track)" />
      </div>
      <div className={`${TILE_CLASS} sm:col-span-2 lg:col-span-3`}>
        <Skeleton className="h-10 w-full bg-(--control-track)" />
      </div>
    </div>
  );
}
