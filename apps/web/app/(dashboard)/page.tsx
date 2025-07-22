'use client';

import { UserButton } from '@daveyplate/better-auth-ui';
import { Button } from '@repo/design';

import { trpc } from '@/core';

export default function Page() {
  const { data, isLoading } = trpc.test.useQuery();
  const { mutate } = trpc.ai.useMutation();

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-primary text-2xl font-bold">Counting: {isLoading ? '...' : data}</h1>
        <Button onClick={() => mutate()}>Generate AI Call</Button>
        <UserButton />
      </div>
    </div>
  );
}
