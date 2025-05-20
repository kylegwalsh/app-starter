import { Button } from '@lib/ui';
import { trpc } from '@/core';

export default function Page() {
  const { data, isLoading } = trpc.test.useQuery();

  return (
    <div className="flex items-center justify-center min-h-svh">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Hello World {isLoading ? 'Loading...' : data}</h1>
        <Button size="sm">Button</Button>
      </div>
    </div>
  );
}
