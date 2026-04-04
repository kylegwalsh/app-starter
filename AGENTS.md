# App Starter

Monorepo managed with **bun + SST + Turborepo**. TypeScript everywhere.

## Structure

```text
apps/
  web/           Next.js frontend (Tailwind v4, oRPC, Jotai, Better Auth)
  admin/         Admin panel (Next.js App Router, Better Auth admin)
  backend/       SST serverless backend (Hono, oRPC, Prisma, Stripe, Better Auth)
  storybook/     Component stories
  docs/          Fumadocs (optional)
packages/
  design/        Component library (Radix/shadcn, Tailwind v4)
  config/        Shared runtime config + env helpers
  constants/     Shared constants (plans, etc.)
  schemas/       Shared Zod schemas
  logs/          Logging (pino, backend only)
  ai/            AI utilities (backend only)
  analytics/     PostHog analytics
  seo/           SEO helpers
  utils/         General utilities
  email/         Email helpers
  tsconfig/      Shared TS config
infra/           SST/AWS infrastructure stacks
  api/           API Gateway
  docs/          Docs site
  secrets/       Shared secrets (AWS Secrets Manager)
  web/           Web app
```

## Commands

- `bun dev`: Start all dev servers
- `bun lint` / `bun lint:fix`: Lint all code
- `bun format`: Format all code

## Working in a Git Worktree

When working in a git worktree (e.g. `.claude/worktrees/<name>`), run this once after creating the worktree:

```bash
bun setup-worktree
```

This installs dependencies and symlinks `.sst/platform` from the main worktree so SST global types (`$app`, `sst`) are available for type-aware linting. Without this, `bun lint` will report `Cannot find name '$app'` / `Cannot find name 'sst'` errors.

> **Prerequisite:** The main repo must have `.sst/platform` already generated (run `bun dev` at least once in the main repo).

## Principles

Clarity · Consistency · Simplicity · Reliability · Observability

## Code Style

- **Follow established patterns**: Before writing new code, look at nearby files for conventions (naming, structure, error handling, imports). Match what's already there rather than introducing new patterns.
- **Arrow functions**: `const fn = () => {}` over `function fn() {}`. Keep exported page/component functions named.
- **Named exports**: Always use named exports with descriptive names.
- **Guard clauses**: Early returns, max 2 levels of nesting.
- **No `any`**: Use `unknown` + type guards. Prefer `type` over `interface`.
- **Comments**: Include helpful comments where appropriate.
- **Formatting**: Multi-line readability over dense one-liners. Repo uses oxlint + oxfmt.

## TypeScript Conventions

- `type` over `interface`. Compose with unions/intersections. No declaration merging or `namespace`.
- Prefer inference. Annotate return types only for exported/public APIs.
- Derive from implementations:
  - `ReturnType<typeof fn>` / `Awaited<ReturnType<typeof fn>>` for function results
  - `z.infer<typeof Schema>` for Zod schemas
  - Generated `@prisma/client` types for DB entities
- No `any`. Use `unknown` + narrow with type guards (`in`, `typeof`, `Array.isArray`, discriminated unions).
- String literal unions over enums. `as const` objects + `keyof typeof` for value maps.
- Use `Pick`, `Omit`, `Partial`, `Required`, `Readonly`, `Record`, `NonNullable`, `Extract`, `Exclude` to transform shapes.
- `satisfies` for constant objects to keep keys/types in sync without widening.
- `undefined` for optional fields. `null` only for meaningful domain values.
- No non-null assertions (`!`) or type assertions. Model types correctly or narrow.
- Concise JSDoc on exported types/functions.
