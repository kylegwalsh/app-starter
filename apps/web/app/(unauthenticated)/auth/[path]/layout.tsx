import { Logo } from '@repo/design';

/** The layout for the authentication pages */
const AuthLayout: FC = ({ children }) => (
  <div className="relative flex w-full flex-col lg:grid lg:h-dvh lg:max-w-none lg:grid-cols-2 lg:items-center lg:justify-center lg:px-0">
    <div className="bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r">
      <div className="absolute inset-0 bg-zinc-900" />
      <Logo />
    </div>
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-4 py-8 sm:px-6 lg:block lg:min-h-0 lg:items-start lg:justify-start lg:p-8">
      <div className="mx-auto w-full max-w-md flex-col justify-center space-y-6 sm:flex sm:max-w-[600px]">
        {children}
      </div>
    </div>
  </div>
);

export default AuthLayout;
