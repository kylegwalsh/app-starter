# Marketing

This app is the optional public marketing site, served at the root domain while the web app lives at `app.`. It provides the plumbing, ready to be designed and filled in with AI.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Enabling](#enabling)
- [Running Locally](#running-locally)
- [Deploying](#deploying)
- [Contact Form](#contact-form)
- [Branding](#branding)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- Next.js static export (no server runtime)
- Sign in / sign up links into the web app
- A contact form that emails submissions to the support inbox
- SEO metadata (`@repo/seo`), sitemap, robots.txt, and OG image
- PostHog analytics, sharing visitors' identity with the web app

## Directory Structure

```text
apps/marketing/
├── app/                      # Next.js routes (App Router, statically exported)
│   ├── layout.tsx            # Root layout, fonts, SEO metadata
│   ├── page.tsx              # The landing page
│   ├── globals.css           # Brand tokens and global styles
│   ├── og.png/route.tsx      # Generated OG image
│   ├── robots.ts             # robots.txt (only prod is indexed)
│   └── sitemap.ts            # sitemap.xml
├── sections/                 # Page sections (hero, contact, ...)
├── components/               # Building blocks and layout (nav, footer, contact form, visual)
├── lib/api.ts                # Hono client for the backend's public endpoints
├── instrumentation-client.ts # PostHog analytics
├── next.config.ts            # Next.js config (static export)
├── AGENTS.md                 # Design guidance for building out the site with AI
└── package.json
```

## Enabling

The site is optional and disabled by default. `bun run init` asks whether you want it and enables it for you. To enable it by hand, uncomment `marketing` in two places:

1. `sst.config.ts`: `await import('./infra/marketing');` (deploys the site)
2. `infra/api.ts`: the `const { marketing } = ...` import and `marketing` in the `link` array (so the backend allows its origin for the contact form)

Both are needed. Without the API link, the site deploys but the contact form fails CORS.

## Running Locally

From the repo root, start SST which also starts the marketing site:

```sh
bun dev
```

## Deploying

Once enabled, it deploys with everything else. From the repo root:

```sh
bun run deploy
```

## Contact Form

The site also includes a contact form connected to our backend that sends form submissions to the support inbox.

`bun run init` sets it up initially, but you can also run the email step specifically with `bun run init:email`. It asks for the support inbox (`config.app.supportEmail`), uploads the contact form template from `packages/email/templates` and saves its ID to `config.posthog.email.templates.contactFormSubmission`.
