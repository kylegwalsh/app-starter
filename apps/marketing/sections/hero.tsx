import { config } from '@repo/config';
import { Button } from '@repo/design';

import { Visual } from '@/components';

/** The hero section (placeholder copy, replace it for the product) */
export const Hero = () => (
  <section className="relative overflow-hidden">
    {/* Soft brand wash behind the hero */}
    <div
      aria-hidden
      className="from-brand/5 pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-gradient-to-b to-transparent"
    />

    <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="border-brand/20 bg-brand/10 text-brand mb-6 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
          A short line naming the category
        </span>

        <h1 className="text-4xl font-semibold sm:text-6xl">{config.app.name}</h1>

        <p className="text-muted-foreground mt-6 max-w-2xl text-lg text-pretty">
          Replace this with the one sentence that explains what the product does and who it's for.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
            <a href={`${config.app.url}/auth/sign-up`}>Get started</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#contact">Contact us</a>
          </Button>
        </div>
      </div>

      <Visual
        glow
        className="mt-14 sm:mt-16"
        label="Product screenshot (add it to public/ and pass `src` to Visual)"
      />
    </div>
  </section>
);
