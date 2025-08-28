# Web

This app is a Next.js (App Router) frontend for the monorepo. It integrates Better Auth, tRPC (React Query), Tailwind v4 via `@repo/design`, and analytics. It pairs with the backend for typed APIs and shared config.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Running Locally](#running-locally)
- [Deploying](#deploying)
- [Design System](#design-system)
- [Authentication](#authentication)
- [APIs](#apis)
- [State](#state)
- [Testing](#testing)
  - [Vite (unit)](#vite-unit)
  - [Playwright (e2e)](#playwright-e2e)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- Next.js App Router with server and client components
- Type-safe API calls with tRPC React Query bound to the backend `AppRouter`
- Better Auth UI integration and session-aware layouts
- Shared design system and global styles from `@repo/design`

## Directory Structure

```text
apps/web/
├── app/                   # Next.js routes (App Router)
│   ├── layout.tsx         # Root layout, global providers, scripts
│   ├── not-found.tsx      # 404 page
│   ├── (authenticated)/   # Auth-gated routes and nested layout
│   └── (unauthenticated)/ # Unauthenticated routes managed by Better Auth UI
├── components/            # UI building blocks and providers directly related to this app
├── core/                  # App-level singletons & clients
│   ├── auth.ts            # Better Auth client (plugins configured)
│   ├── trpc.ts            # TRPC React client bound to backend AppRouter
│   └── ...
├── hooks/                 # React hooks for reusable state
├── tests/                 # Web tests
│   ├── core/              # Core tests (vitest)
│   └── e2e/               # E2E tests (playwright)
├── scripts/               # Local scripts (e.g., Playwright install)
├── next.config.ts         # Next.js config
├── vitest.config.ts       # Vitest config
├── playwright.config.ts   # Playwright E2E config
└── package.json
```

## Running Locally

From the repo root, start SST which also starts the web app:

```sh
pnpm dev
```

## Deploying

From the repo root, you can deploy the infrastructure and apps with SST:

```sh
pnpm run deploy
```

## Design System

The shared `@repo/design` system standardizes UI across apps and bundles accessible components, Tailwind v4, global styles, and theming.

- Package: `@repo/design`
- Tailwind v4: Pre-configured and bundled in the design package; global styles imported in `app/layout.tsx` via `@repo/design/globals.css`.
- Theming: Use `ThemeProvider` from `@repo/design` (wired in `components/providers/providers.tsx`) for light/dark mode and CSS variables.
- Layout primitives: Shared layout components and patterns ensure consistent spacing, typography, and responsive behavior.

## Authentication

Better Auth powers authentication and provides hooks/UI for user and organization flows.

- Client: Configured in `core/auth.ts` (baseURL to backend, plugins for org/admin/stripe).
- UI: `components/providers/auth-provider.tsx` wires the Better Auth UI provider to Next navigation (push/replace) and app URL.
- Routing: Unauthenticated flows are handled under `app/(unauthenticated)`, while `app/(authenticated)/layout.tsx` protects app content (redirects to sign-in, shows loading, renders when signed in).
- Access: Hooks like `auth.useSession()` are wrapped by our `use-user`/`use-organization` hooks for convenient consumption.

## APIs

The app communicates with the backend via tRPC and React Query for fetching and mutations.

- Types: We import the backend `AppRouter` and create a typed client in `core/trpc.ts`.
- Usage: `trpc.<router>.<procedure>.useQuery()` for reads, `.useMutation()` for writes; React Query manages caching and invalidation.

## State

React Query manages server state (caching, deduplication, automatic retries). For other global state we use Jotai when needed.

- [React Query](https://tanstack.com/query/latest/docs/framework/react/overview): Automatically caches requests and manages query data.
- [Jotai](https://jotai.org/): Define small atoms for local cross-component state and derive values with computed atoms. Atoms compose naturally inside hooks/components without a central store.

## Testing

We use two different test frameworks in the web to cover different use cases.

### Vite (unit)

Vitest is used for any unit/component tests and us to test individual elements of the app.

You can run vite tests from the repo root using one of the following commands:

```sh
pnpm web test
pnpm web test:ui
```

### Playwright (e2e)

Playwright drives real browser sessions against a running app to validate critical flows end-to-end (auth, navigation, data fetching). E2E specs live under `tests/e2e` and use the shared config in `playwright.config.ts`.

You can run playwright tests from the repo root using one of the following commands:

```sh
pnpm web test:e2e
pnpm web test:e2e:ui
```
