import { Skeleton } from "@/components/ui/skeleton";

export function SensorChartsSkeleton(): React.JSX.Element {
  return (
    <div className="rounded-panel border border-(--glass-border) bg-(--glass-surface) p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-28 rounded-full bg-(--control-track)" />
        ))}
      </div>

      <Skeleton className="h-[360px] w-full rounded-3xl bg-(--control-track) sm:h-[420px]" />
    </div>
  );
}
