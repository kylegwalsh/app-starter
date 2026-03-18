# Admin

This app is the internal admin panel for managing users and organizations. It is built with Next.js (App Router, client-rendered), Tailwind v4 via `@repo/design`, and Better Auth's admin client. It connects directly to the backend's auth API for all admin operations.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Running Locally](#running-locally)
- [Deploying](#deploying)
- [Design System](#design-system)
- [Authentication](#authentication)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- Next.js App Router with all pages client-rendered (`'use client'`)
- Better Auth admin + organization client for user/org management
- Shared design system and global styles from `@repo/design`
- Admin-only access enforced via Better Auth role checks

## Directory Structure

```text
apps/admin/
├── app/                       # Next.js routes (App Router)
│   ├── layout.tsx             # Root layout, AuthProvider, fonts, globals.css
│   ├── page.tsx               # Landing / redirect
│   ├── login/                 # Admin login page
│   └── dashboard/             # Protected admin routes
│       ├── layout.tsx         # Dashboard shell (sidebar, RequireAdmin gate)
│       ├── page.tsx           # Dashboard overview (stats)
│       ├── users/             # User management pages
│       └── organizations/     # Organization management pages
├── components/                # UI components (user management, org management, shared)
├── contexts/                  # Auth context provider
├── core/                      # App-level singletons & clients
│   └── auth.ts                # Better Auth client (admin + organization plugins)
├── next.config.ts             # Next.js config
├── postcss.config.mjs         # PostCSS config
└── package.json
```

## Running Locally

From the repo root, start SST which also starts the admin app:

```sh
bun dev
```

## Deploying

From the repo root, you can deploy the infrastructure and apps with SST:

```sh
bun run deploy
```

## Design System

The shared `@repo/design` system standardizes UI across apps and bundles accessible components, Tailwind v4, and theming.

- Package: `@repo/design`
- Tailwind v4: Admin uses its own `app/globals.css` with distinct oklch theme tokens, separate from `@repo/design/globals.css`.
- Icons: `lucide-react` (no inline SVGs).

## Authentication

Better Auth powers authentication and provides the admin + organization SDK for management operations.

- Client: Configured in `core/auth.ts` (baseURL to backend, admin + organization plugins).
- Context: `contexts/auth-context.tsx` manages session state, login/logout, and admin role checks.
- Routing: The `RequireAdmin` component in `components/require-admin.tsx` gates all dashboard routes — unauthenticated users are redirected to `/login?redirect=<path>`, non-admin users see an access denied page.
- Access: `useAuth()` hook provides `user`, `isAdmin`, `isAuthenticated`, `login`, `logout`, and `clearError`.
