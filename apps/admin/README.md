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

Better Auth with admin + organization plugins. Client configured in `core/auth.ts`, session state managed via `contexts/auth-context.tsx`. All dashboard routes are gated by the `RequireAdmin` component — unauthenticated users redirect to `/login`, non-admins see an access denied page.

## Features

- **User Management**: View, edit, ban/unban, delete users, and reset passwords from `/dashboard/users/[userId]`.
- **Organization Management**: View and manage organizations from `/dashboard/organizations`.
- **Impersonation**: Start a session as any non-admin user and get redirected to the main web app. Requires a custom domain deployment (`config.hasCustomDomain`).
- **Session Management**: View and revoke individual or all sessions for a user.
