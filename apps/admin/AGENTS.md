# Admin Guidelines

## Stack

Next.js (TypeScript), Tailwind CSS v4, shadcn/ui (`@repo/design`), lucide-react, Better Auth (admin + organization plugins)

## Directory Layout

```text
app/          App Router: layouts, pages (all client-rendered)
components/   Reusable UI (user management, org management, shared)
contexts/     Auth context provider
core/         Clients and core utilities (auth)
```

## Commands

- `bun dev`: Start admin dev server via SST
- `bun admin run build`: Build for production

## UI/UX

- **Typography**: 4–5 font sizes/weights max. `text-xs` for captions. Avoid `text-xl` unless hero/major headings.
- **Color**: 1 neutral base (e.g., `zinc`) + up to 2 accents.
- **Spacing**: Multiples of 4 for padding/margins. Fixed height containers with internal scrolling for long content.
- **Loading states**: Skeleton placeholders or `animate-pulse` during fetches. Use `Button`'s built-in `loading` prop (spinner + disabled) instead of ternaries on button text.
- **Interactivity**: Hover transitions (`hover:bg-*`, `hover:shadow-md`) for clickable elements.
- **Accessibility**: Semantic HTML, ARIA roles. Prefer Radix/shadcn components (accessibility built in).

## Next.js

- All pages are client-rendered (`'use client'`) — no SSR.
- Always use named exports with descriptive names: `export default function DashboardPage() {}`.
- Dynamic routes use `[param]` folder convention (e.g., `[userId]`, `[orgId]`).

## Authentication

- Auth client configured in `core/auth.ts` with admin + organization plugins
- Session state managed via `contexts/auth-context.tsx`
- Login page at `/login`, dashboard routes require admin role
- `RequireAdmin` wrapper component gates dashboard routes
- Unauthenticated users redirected to `/login?redirect=<path>`

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
