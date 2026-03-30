import { Skeleton } from "@/components/ui/skeleton";

export function WeatherSummarySkeleton(): React.JSX.Element {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28 bg-white/10" />
          <Skeleton className="h-16 w-56 bg-white/10" />
        </div>
        <Skeleton className="h-16 w-16 rounded-2xl bg-white/10" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl bg-white/10" />
        ))}
      </div>
    </div>
  );
}
