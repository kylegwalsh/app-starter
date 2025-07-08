'use client';

import { Button } from '@repo/design';

import { trpc } from '@/core';

function myErrorMethod() {
  throw new Error('test');
}

export default function Page() {
  const { data, isLoading } = trpc.test.useQuery();
  const { mutate: error } = trpc.error.useMutation();

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-primary text-2xl font-bold">Counting: {isLoading ? '...' : data}</h1>
        <Button
          onClick={() => {
            myErrorMethod();
          }}>
          Frontend Error
        </Button>
        <Button onClick={() => error()}>Backend Error</Button>
      </div>
    </div>
  );
}
