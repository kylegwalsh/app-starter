'use client';

import { analytics } from '@repo/analytics';
import { Button } from '@repo/design';
import { useState } from 'react';

import { trpc } from '@/core';

const nestedErrorMethod = () => {
  try {
    console.log('Testing click on error button');
    throw new Error('Testing method error');
  } catch (error) {
    void analytics.captureException(error);
    void analytics.captureException(new Error('Separate error method'), { different: true });
  }
};

const mySeparateErrorMethod = () => {
  nestedErrorMethod();
};

export default function Page() {
  const { data, isLoading } = trpc.test.useQuery();
  const { mutate: error } = trpc.triggerError.useMutation();
  const [crash, setCrash] = useState(false);

  if (crash) {
    throw new Error('Testing crash error');
  }

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-primary text-2xl font-bold">Counting: {isLoading ? '...' : data}</h1>
        <Button
          onClick={() => {
            mySeparateErrorMethod();
          }}>
          Frontend Method Error
        </Button>
        <Button onClick={() => setCrash(true)}>Frontend Crash error</Button>
        <Button onClick={() => error()}>Backend Method Error</Button>
      </div>
    </div>
  );
}
