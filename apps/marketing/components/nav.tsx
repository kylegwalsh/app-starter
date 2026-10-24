import { config } from '@repo/config';
import { Button, Logo } from '@repo/design';
import Link from 'next/link';

/** The top navigation bar */
export const Nav = () => (
  <header className="border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
    <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <Link href="/" aria-label="Home">
        <Logo />
      </Link>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <a href={`${config.app.url}/auth/sign-in`}>Sign in</a>
        </Button>
        <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
          <a href={`${config.app.url}/auth/sign-up`}>Get started</a>
        </Button>
      </div>
    </nav>
  </header>
);
