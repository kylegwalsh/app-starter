# Plan: Better Auth Admin Panel

Add a standalone admin dashboard app (`apps/admin`) deployed at `admin.{domain}` that uses the existing Better Auth backend with the already-enabled `adminPlugin()`.

Reference: https://github.com/Tranthanh98/better-auth-dashboard/tree/master/client

---

## 1. Create `apps/admin` — React Router 7 + Vite app

Based on the better-auth-dashboard client, create a new app in `apps/admin/` using:
- **React 19** + **React Router 7** (framework mode with SSR disabled for static SPA)
- **Vite** as the build tool
- **Tailwind CSS v4** (matching the repo's existing version)
- **Better Auth client** with `adminClient()` plugin (same pattern as `apps/web/core/auth.ts`)

### Files to create

```
apps/admin/
  package.json            # Dependencies: react, react-router, better-auth, tailwind, vite
  tsconfig.json           # Extends @repo/tsconfig
  vite.config.ts          # Vite config with React plugin
  app/
    root.tsx              # Root layout (html/head/body, Tailwind import, outlet)
    routes.ts             # Route definitions (login, dashboard, users)
    routes/
      login.tsx           # Admin login page (email/password form using Better Auth)
      layout.tsx          # Authenticated layout with nav sidebar + admin guard
      home.tsx            # Dashboard overview (user count, recent signups stats)
      users.tsx           # User list with search, filter, ban/unban, role management
      users.$id.tsx       # User detail / edit page
    lib/
      auth.ts             # Better Auth client (createAuthClient with adminClient plugin)
      admin-api.ts        # Typed wrappers around admin endpoints (list-users, ban, set-role, etc.)
    components/
      admin-guard.tsx     # Redirects non-admin users to login
      stats-card.tsx      # Reusable dashboard stat card
      user-table.tsx      # User table with search/filter/pagination
      user-actions.tsx    # Ban/unban/delete/role-change action buttons
    contexts/
      auth-context.tsx    # Auth session context provider
```

### Key design decisions

- **SPA (no SSR)**: The admin panel is an internal tool — deploy as a static SPA via SST's `StaticSite` construct. This keeps the deployment simple and avoids needing a Lambda for server rendering.
- **Reuse existing auth backend**: The admin app points its Better Auth client at the same `api.{domain}` backend. No new backend routes or plugins needed — `adminPlugin()` is already enabled.
- **Admin guard**: On app load, check the session via Better Auth. If the user doesn't have `role: "admin"`, redirect to login or show an unauthorized message.

---

## 2. Update Better Auth backend — add admin origin to trusted origins

**File: `apps/backend/core/auth.ts`**

The `trustedOrigins` array currently only includes `config.app.url`. Add the admin URL:

```typescript
trustedOrigins: [config.app.url as string, config.admin?.url].filter(Boolean) as string[],
```

This allows the admin panel (on a different subdomain) to make authenticated cross-origin requests to the API.

---

## 3. Add admin URL to config package

**File: `packages/config/config.ts`**

Add an `admin` section to the config object:

```typescript
admin: {
  url: adminUrl,
},
```

And derive `adminUrl` similarly to `appUrl`:

```typescript
let adminUrl = '';
try {
  adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? resources?.admin?.url ?? '';
} catch {
  // Do nothing
}
```

This lets both the backend (for trusted origins) and the admin app itself reference the admin URL.

---

## 4. Add SST infrastructure for admin site

**New file: `infra/admin.ts`**

```typescript
import { api } from './api';
import { domain } from './utils';

export const admin = new sst.aws.StaticSite('admin', {
  domain: domain ? `admin.${domain}` : undefined,
  path: 'apps/admin',
  build: {
    command: 'bun run build',
    output: 'build/client',
  },
  environment: {
    VITE_API_URL: api.url,
    VITE_STAGE: $app.stage,
  },
});
```

Using `StaticSite` (not `Nextjs`) since this is a Vite SPA — simpler deployment, no Lambda needed.

**File: `sst.config.ts`**

Add the import alongside the other infrastructure stacks:

```typescript
await import('./infra/admin');
```

---

## 5. Update monorepo configuration

**File: `package.json` (root)**

Add admin scripts to the workspace if needed. The app should be auto-discovered by bun workspaces if `apps/*` is already in the workspace glob.

**File: `turbo.json`**

No changes expected — the existing task definitions should apply to the new app.

---

## 6. Admin dashboard features

The admin panel will support these features via the Better Auth admin API:

| Feature | Endpoint | Page |
|---------|----------|------|
| List users (paginated, searchable) | `GET /api/auth/admin/list-users` | `/users` |
| View user details | `GET /api/auth/admin/list-users?searchField=id&searchValue=...` | `/users/:id` |
| Create user | `POST /api/auth/admin/create-user` | Modal on `/users` |
| Update user | `POST /api/auth/admin/update-user` | `/users/:id` |
| Delete user | `POST /api/auth/admin/remove-user` | `/users/:id` |
| Ban/unban user | `POST /api/auth/admin/ban-user` / `unban-user` | `/users` |
| Set user role | `POST /api/auth/admin/set-role` | `/users/:id` |
| Dashboard stats | Derived from user list counts | `/` |

All calls go through the Better Auth client's `auth.admin.*` methods — no raw fetch needed.

---

## 7. Summary of all changed/created files

### New files
- `apps/admin/` — Entire new app (~15 files)
- `infra/admin.ts` — SST static site deployment

### Modified files
- `apps/backend/core/auth.ts` — Add admin URL to `trustedOrigins`
- `packages/config/config.ts` — Add `admin.url` config
- `sst.config.ts` — Import `infra/admin`

### No changes needed
- Backend auth plugin config (already has `adminPlugin()`)
- Frontend web app (separate concern)
- Database schema (admin plugin uses existing tables)
- Secrets (reuses existing `BETTER_AUTH_SECRET`, no new secrets)

---

## 8. Implementation order

1. Create `apps/admin` scaffold (package.json, vite config, tsconfig, tailwind)
2. Create auth client (`app/lib/auth.ts`)
3. Create auth context and admin guard components
4. Create login page
5. Create authenticated layout with sidebar nav
6. Create dashboard home page with stats
7. Create users list page with search/filter/ban
8. Create user detail/edit page
9. Add `infra/admin.ts` SST stack
10. Update `sst.config.ts` to import admin stack
11. Update `packages/config/config.ts` with admin URL
12. Update `apps/backend/core/auth.ts` trusted origins
13. Test locally with `bun dev`
