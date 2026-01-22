import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  mobileCards?: boolean;
}

export function TableSkeleton({ rows = 5, cols = 4, mobileCards = true }: TableSkeletonProps) {
  return (
    <>
      {/* Desktop Table View */}
      <div className={cn("space-y-3", mobileCards && "hidden md:block")}>
        <div className="flex justify-between mb-4">
          <Skeleton className="h-10 w-[200px] md:w-[250px]" />
          <Skeleton className="h-10 w-[100px] md:w-[150px]" />
        </div>
        <div className="rounded-md border border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border/50 flex gap-4 bg-muted/30">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full bg-muted-foreground/10" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4 flex gap-4 border-b border-border/50 last:border-0 items-center">
              {Array.from({ length: cols }).map((_, j) => (
                <Skeleton key={j} className="h-6 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Card View (Optional) */}
      {mobileCards && (
        <div className="md:hidden space-y-4">
          <Skeleton className="h-10 w-full mb-4" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 p-4 space-y-3 bg-card">
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-2/3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <div className="pt-2 border-t border-border/50 flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

interface CardSkeletonProps {
  count?: number;
  className?: string;
}

export function CardSkeleton({ count = 3, className }: CardSkeletonProps) {
  return (
    <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/50 p-6 space-y-4 bg-card h-full">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="pt-2">
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ListSkeletonProps {
  count?: number;
}

export function ListSkeleton({ count = 3 }: ListSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/50 p-6 bg-card flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2 w-3/4">
              <Skeleton className="h-6 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}

// Change Log:
// - Updated `TableSkeleton` to support a mobile card layout automatically when `mobileCards` is true (default).
// - Added `ListSkeleton` for single-column feeds (like announcements).
// - Added `className` prop to `CardSkeleton` for grid customization.