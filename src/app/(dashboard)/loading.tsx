import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 space-y-3">
          {/* Table header */}
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-8 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
