# Admin

This app is the internal admin panel for managing users and organizations. It is built with React Router v7 (SPA mode), Tailwind v4, and Better Auth's admin client. It connects directly to the backend's auth API for all admin operations.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Running Locally](#running-locally)
- [Authentication](#authentication)
- [Design System](#design-system)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- React Router v7 in SPA mode (no SSR)
- Better Auth admin client for user/org management
- Tailwind v4 for styling
- Admin-only access enforced via Better Auth role checks

## Directory Structure

```text
apps/admin/
├── app/
│   ├── components/        # UI components (user management, org management)
│   ├── contexts/          # Auth context provider
│   ├── lib/               # Auth client configuration
│   ├── routes/            # React Router route modules
│   │   ├── dashboard/     # Protected dashboard routes (users, orgs)
│   │   ├── home.tsx       # Landing / redirect
│   │   └── login.tsx      # Admin login
│   ├── root.tsx           # Root layout
│   ├── routes.ts          # Route definitions
│   └── app.css            # Global styles
├── react-router.config.ts # React Router SPA config
├── vite.config.ts         # Vite config
└── package.json
```

## Running Locally

From the repo root, start all dev servers (includes admin):

```sh
bun dev
```

Or run the admin app individually:

```sh
bun admin dev
```

## Authentication

The admin panel uses Better Auth's admin plugin to authenticate and authorize. Only users with the `admin` role can access the dashboard. The auth client is configured in `lib/auth-client.ts` and session state is managed via `contexts/auth-context.tsx`.

## Design System

The admin panel uses Tailwind v4 directly for styling. Global styles are defined in `app/app.css`.
