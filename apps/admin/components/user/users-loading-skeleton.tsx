import { Card, Skeleton } from '@repo/design';

export const UsersLoadingSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header: title + button */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Filters: search input + select */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-[180px]" />
      </div>

      {/* Table */}
      <Card>
        <div className="p-4">
          {/* Table header */}
          <div className="flex items-center gap-4 border-b pb-3">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="hidden h-4 w-12 md:block" />
            <Skeleton className="hidden h-8 w-20 sm:block" />
          </div>
          {/* Table rows */}
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-b py-3 last:border-0">
              <Skeleton className="size-8 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="hidden h-4 w-12 md:block" />
              <Skeleton className="hidden h-4 w-20 sm:block" />
            </div>
          ))}
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
};
