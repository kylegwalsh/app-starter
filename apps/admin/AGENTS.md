# Admin Guidelines

## Stack

React Router v7 (SPA mode), TypeScript, Tailwind CSS v4, Better Auth (admin plugin)

## Directory Layout

```text
app/
  components/   UI components (user management, org management, shared)
  contexts/     Auth context provider
  lib/          Auth client configuration
  routes/       React Router route modules
    dashboard/  Protected admin routes (users, orgs)
```

## Commands

- `bun admin dev`: Start admin dev server
- `bun admin run build`: Build for production
- `bun admin run typecheck`: Type-check the admin app

## UI/UX

- Uses `@repo/design` shared component library (shadcn/ui + Radix primitives)
- Tailwind CSS v4 with `@tailwindcss/vite` plugin and shadcn theme variables (oklch)
- Icons from `lucide-react` (no inline SVGs)
- Admin-only access enforced via Better Auth role checks
- `RequireAdmin` wrapper component gates dashboard routes

## Authentication

- Auth client configured in `lib/auth-client.ts` with admin + organization plugins
- Session state managed via `contexts/auth-context.tsx`
- Login page at `/login`, dashboard routes require admin role

## Routing

- SPA mode (`ssr: false` in `react-router.config.ts`)
- Routes defined in `routes.ts` using `flatRoutes`-style conventions
- Dashboard layout in `routes/dashboard.tsx` wraps all protected routes
