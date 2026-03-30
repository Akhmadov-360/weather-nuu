import { Skeleton } from "@/components/ui/skeleton";

export function SensorChartsSkeleton(): React.JSX.Element {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/6 p-4 backdrop-blur-xl sm:p-5">
      <div className="mb-5 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-28 rounded-full bg-white/10" />
        ))}
      </div>

      <Skeleton className="h-[360px] w-full rounded-3xl bg-white/10 sm:h-[420px]" />
    </div>
  );
}
