import { Card, CardContent, CardFooter, CardHeader, Skeleton } from '@repo/design';

/** Skeleton that mirrors the authorize card layout */
export const AuthorizeSkeleton = () => (
  <Card className="w-full max-w-sm">
    <CardHeader className="justify-items-center text-center">
      <Skeleton className="size-12 rounded-lg" />
      <Skeleton className="h-6 w-full max-w-48 md:h-7" />
      <Skeleton className="h-4 w-full max-w-56 md:h-5" />
    </CardHeader>

    <CardContent className="grid gap-4">
      <div className="grid gap-2">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </CardContent>

    <CardFooter className="justify-center">
      <Skeleton className="h-4 w-full max-w-40" />
    </CardFooter>
  </Card>
);
