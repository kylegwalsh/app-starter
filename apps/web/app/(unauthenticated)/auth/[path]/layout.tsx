import { Logo } from '@repo/design';

/** The layout for the authentication pages */
const AuthLayout: FC = ({ children }) => (
  <div className="relative flex w-full flex-col lg:grid lg:h-dvh lg:max-w-none lg:grid-cols-2 lg:items-center lg:justify-center lg:px-0">
    <div className="bg-muted text-muted-foreground relative hidden h-full flex-col border-r p-10 lg:flex">
      <div className="bg-muted absolute inset-0" />
      <div className="relative z-20">
        <Logo />
      </div>
    </div>
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-4 py-8 sm:px-6 lg:block lg:min-h-0 lg:items-start lg:justify-start lg:p-8">
      <div className="mx-auto w-full max-w-md flex-col justify-center space-y-6 sm:flex sm:max-w-[600px]">
        {children}
      </div>
    </div>
  </div>
);

export default AuthLayout;
