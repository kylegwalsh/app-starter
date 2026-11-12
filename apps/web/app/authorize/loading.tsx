import { AuthorizeSkeleton } from '@/components';

/** Next.js loading UI — required because the page uses useSearchParams which triggers a suspense boundary */
const AuthorizeLoading = () => {
  return (
    <main className="container flex grow flex-col items-center justify-center self-center p-0">
      <AuthorizeSkeleton />
    </main>
  );
};

export default AuthorizeLoading;
