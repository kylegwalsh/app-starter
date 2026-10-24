# Marketing Guidelines

## Stack

Next.js static export (TypeScript), Tailwind CSS v4, `@repo/design` (form controls and buttons), `@repo/seo`, `@repo/analytics` (PostHog), oRPC client (contact form only)

## Directory Layout

```text
app/          Pages, metadata routes (sitemap, robots, OG image), globals.css (brand tokens)
sections/     Page sections (hero, contact), composed in app/page.tsx
components/   Building blocks and layout chrome (nav, footer, contact form, visual)
lib/          The oRPC client
```

## Commands

- `bun dev`: Starts the site on port 3003 alongside the other apps (once enabled). It gets its env (app and site URLs) from SST, so don't run it on its own.

## Deployment

- Optional, disabled by default. Enabled by `bun run init`, or by uncommenting `marketing` in `sst.config.ts` (deploys it) and in `infra/api.ts` (links it so the API allows its origin). Both are required.
- Deployed as an `sst.aws.StaticSite` at the root domain (the web app lives at `app.`), with a `www` redirect in prod.
- **Static export only**: no server components that fetch at request time, no route handlers, no middleware, no `next/image` optimization. Metadata routes need `export const dynamic = 'force-static'`.

## Designing the Site

- **Start from the product, not a layout.** Know who it's for, the one problem it solves, and the single action you want a visitor to take before writing sections.
- **A landing page usually needs**: a clear value proposition (headline + one sentence), proof (product visuals, outcomes, logos, testimonials), how it works, and a repeated call to action. Choose and order these for the product; skip what doesn't apply.
- **Show the product.** Real screenshots, UI recreated in markup, or a short demo beat abstract illustrations. Put screenshots in `public/` and pass them to `<Visual src>`; it shows a placeholder until then.
- **Identity lives in `app/globals.css` and `app/layout.tsx`.** Change `--brand`, `--surface`, and the fonts (`next/font`) first (the OG image reads `--brand` from the CSS). A distinctive display typeface and a confident accent do most of the work.
- **Don't make it look like the app.** `@repo/design` is for form controls and buttons. Build sections with plain Tailwind; avoid stacking cards-in-grids that read as a dashboard.
- **Copy is design.** Specific, concrete, short. No filler ("seamless", "revolutionize", "all-in-one").
- **Quality bar**: responsive down to 360px, semantic headings (one `h1`), visible focus states, sufficient contrast, `alt` text, fast (no heavy client JS for decoration).

## Conventions

- Sections are named exports in `sections/` (one per file), composed in `app/page.tsx`. Pieces they share, and layout chrome, go in `components/`.
- Server components by default; `'use client'` only where interactivity requires it.
- PostHog (pageviews, autocapture, exceptions) starts in `instrumentation-client.ts` on deployed stages. Track custom events with `analytics` from `@repo/analytics`.
- New pages: add a `metadata` export via `createMetadata()` and add the path to `app/sitemap.ts`.
- Use `<a href>` (not `next/link`) for links into the web app (`config.app.url`); it's a different origin. This site's own URL is `config.marketing.url`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
