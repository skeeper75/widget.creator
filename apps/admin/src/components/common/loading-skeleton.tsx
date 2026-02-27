"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSkeletonProps {
  /** Variant of skeleton layout */
  variant?: "table" | "form" | "card" | "detail";
  /** Number of rows for table variant */
  rows?: number;
  /** Number of columns for table variant */
  columns?: number;
}

/**
 * Skeleton loading component for various page layouts.
 * REQ-S-005: Skeleton UI during data loading.
 */
export function LoadingSkeleton({
  variant = "table",
  rows = 5,
  columns = 4,
}: LoadingSkeletonProps) {
  if (variant === "table") {
    return (
      <div className="space-y-4">
        {/* Toolbar skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-8 w-[100px]" />
        </div>
        {/* Table skeleton */}
        <div className="rounded-md border">
          <div className="border-b p-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={`header-${i}`} className="h-4 flex-1" />
              ))}
            </div>
          </div>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={`row-${rowIdx}`} className="border-b p-4 last:border-0">
              <div className="flex space-x-4">
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <Skeleton
                    key={`cell-${rowIdx}-${colIdx}`}
                    className="h-4 flex-1"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className="space-y-6">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={`field-${i}`} className="space-y-2">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-[120px]" />
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={`card-${i}`} className="rounded-lg border p-6 space-y-3">
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-8 w-[120px]" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // detail variant
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-[300px]" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={`detail-${i}`} className="space-y-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
