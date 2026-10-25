import { config } from '@repo/config';
import { Logo } from '@repo/design';

// The site is statically exported, so this is the year of the latest deploy
const year = new Date().getFullYear();

/** The site footer */
export const Footer = () => (
  <footer className="border-border/50 border-t py-10">
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
      <Logo />
      <p className="text-muted-foreground text-sm">
        © {year} {config.app.name}. All rights reserved.
      </p>
    </div>
  </footer>
);
