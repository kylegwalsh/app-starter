import { AuthorizeSkeleton } from '@/components';

export default function AuthorizeLoading() {
  return (
    <main className="container flex grow flex-col items-center justify-center self-center p-0">
      <AuthorizeSkeleton />
    </main>
  );
}
