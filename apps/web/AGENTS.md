# Web Guidelines

## Stack

Next.js (TypeScript), Tailwind CSS v4, shadcn/ui (`@repo/design`), lucide-react, oRPC + TanStack Query, Jotai, Better Auth, react-hook-form

## Directory Layout

```text
app/          App Router: layouts, pages, API routes, route groups
components/   Reusable UI (layout, providers, feature components)
core/         Clients and core utilities (auth, orpc, storage)
hooks/        Reusable React hooks (user/session/organization)
atoms/        Global state (Jotai atoms/selectors)
tests/core/   Vitest unit tests
tests/e2e/    Playwright end-to-end tests
```

## Commands

- `bun web run test [-- <vitest-args>]`: Unit tests (Vitest)
- `bun web run test:e2e [-- <playwright-args>]`: E2E tests (Playwright)

## UI/UX

- **Typography**: 4–5 font sizes/weights max. `text-xs` for captions. Avoid `text-xl` unless hero/major headings.
- **Color**: 1 neutral base (e.g., `zinc`) + up to 2 accents.
- **Spacing**: Multiples of 4 for padding/margins. Fixed height containers with internal scrolling for long content.
- **Loading states**: Skeleton placeholders or `animate-pulse` during fetches.
- **Interactivity**: Hover transitions (`hover:bg-*`, `hover:shadow-md`) for clickable elements.
- **Accessibility**: Semantic HTML, ARIA roles. Prefer Radix/shadcn components (accessibility built in).

## Forms

- Use `react-hook-form` for all forms. Combine with Zod schemas from `@repo/schemas` for validation.
- Re-use existing backend/shared schemas (e.g., oRPC input schemas) as form schemas rather than creating separate ones. Use `.pick()` / `.omit()` to narrow if needed.

## Next.js

- Always use named exports with descriptive names: `export default function SettingsPage() {}`.

## TypeScript

- Use the global `FC` type for component definitions:
  - `FC` — standard with children
  - `FC<Props>` — custom props + children
  - `FC<typeof Component>` — inherits props from component
  - `FC<typeof Component, Props>` — inherits + custom props
