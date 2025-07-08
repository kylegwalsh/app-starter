'use client';

import { analytics } from '@repo/analytics';
import { Button } from '@repo/design';
import { useState } from 'react';

import { trpc } from '@/core';

function myErrorMethod() {
  try {
    console.log('Testing click on error button');
    throw new Error('test');
  } catch (error) {
    void analytics.captureException(error, { test: true });
  }
}

export default function Page() {
  const { data, isLoading } = trpc.test.useQuery();
  const { mutate: error } = trpc.error.useMutation();
  const [crash, setCrash] = useState(false);

  if (crash) {
    throw new Error('Manually crashed');
  }

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-primary text-2xl font-bold">Counting: {isLoading ? '...' : data}</h1>
        <Button
          onClick={() => {
            myErrorMethod();
          }}>
          Frontend Method Error
        </Button>
        <Button onClick={() => setCrash(true)}>Frontend Crash error</Button>
        <Button onClick={() => error()}>Backend Method Error</Button>
      </div>
    </div>
  );
}
