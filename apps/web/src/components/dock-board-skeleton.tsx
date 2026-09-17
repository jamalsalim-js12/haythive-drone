import { Skeleton } from "@/components/ui/skeleton";

export function DockBoardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <span className="sr-only">Loading dock</span>
      <div className="shrink-0 border-b border-border bg-card/80 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-28 sm:px-6 md:flex-row md:pb-6">
        <div className="flex w-full shrink-0 flex-col gap-3 md:w-56">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <Skeleton className="h-44 w-full rounded-lg" />
            <Skeleton className="h-44 w-full rounded-lg" />
          </div>
          <div className="grid shrink-0 gap-3 sm:gap-4 lg:grid-cols-2">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
