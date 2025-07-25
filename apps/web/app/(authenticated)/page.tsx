'use client';

import { Button } from '@repo/design';

import { Header } from '@/components';
import { trpc } from '@/core';

/** Our main dashboard page */
export default function DashboardPage() {
  const { data, isLoading } = trpc.test.useQuery();
  const { mutate } = trpc.ai.useMutation();

  return (
    <>
      <Header breadcrumbs={[{ label: 'Overview' }]} />
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-primary text-2xl font-bold">Counting: {isLoading ? '...' : data}</h1>
          <Button onClick={() => mutate()}>Generate AI Call</Button>
        </div>
      </div>
    </>
  );
}
