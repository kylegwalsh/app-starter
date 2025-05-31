'use client';

import { Button } from '@repo/design';

import { trpc } from '@/core';

export default function Page() {
  const { data, isLoading } = trpc.test.useQuery();

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-primary text-2xl font-bold">
          Hello World: {isLoading ? 'Checking count...' : data}
        </h1>
        <Button onClick={() => console.log('clicked')}>Button</Button>
      </div>
    </div>
  );
}
