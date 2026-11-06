import { Skeleton } from '@repo/design';

/** Placeholder shaped like a conversation, shown while its messages load */
export const ConversationSkeleton = () => (
  <div className="flex h-full w-full flex-col">
    <div className="flex flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex justify-end">
        <Skeleton className="h-14 w-[22rem] max-w-[80%] rounded-2xl rounded-br-lg" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-[94%]" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-[82%]" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-[88%]" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </div>

      <div className="flex justify-end">
        <Skeleton className="h-9 w-44 rounded-2xl rounded-br-lg" />
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-[91%]" />
        <Skeleton className="h-5 w-3/4" />
      </div>

      <div className="flex justify-end">
        <Skeleton className="h-9 w-60 rounded-2xl rounded-br-lg" />
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  </div>
);
