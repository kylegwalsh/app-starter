# Backend Guidelines

## Stack

Node.js + TypeScript, SST (AWS Lambda), tRPC, Prisma (Postgres), Better Auth, Stripe, Vitest

## Directory Layout

```text
functions/   Lambda entrypoints (api, auth, crons)
routes/      tRPC routers, context, procedures, middleware (most changes happen here)
core/        Core services (auth, stripe, re-usable business logic helpers)
db/          Prisma schema, migrations, connection utilities
tests/       Vitest setup, factories, mocks (not test files — those live next to source)
```

## Commands

- `/test-backend [file-path]`: Run tests
- `bun backend db:push`: Push Prisma schema to local DB
- `bun backend env:add KEY "dev-val" "prod-val"`: Add secret (then export in `infra/secrets.ts`)

## Code Style

- **Helpers**: Export as cohesive namespaced objects (`time.parse()`, `time.format()`), not scattered top-level functions.
- **Naming**: Descriptive, no abbreviations. Functions = verbs, values = nouns.
- **Errors**: Throw typed/semantic errors. Map to HTTP responses at the edge. Never swallow silently.
- **Validation**: Validate external inputs with Zod schemas from `@repo/schemas`.

## API & Routing

- New routes go in `routes/`. Context via `routes/trpc/context`. Procedures in `routes/trpc/procedures`.
- Errors auto-handled by `routes/trpc/error`.

## Database

- Prisma is source of truth. Local dev: `bun backend db:push`. Production: `bun backend db:migrate`.
- After schema changes run `bun backend db:generate`. Never run migrations directly.
- Prefer Prisma query builders. Raw SQL only when necessary, always parameterized.
- Group multi-step mutations in transactions. Add indexes for frequently queried fields.

## Auth & Security

- Better Auth: identity + org membership derived in request context, enforced via middleware/procedures.
- Never log secrets or expose API keys to frontend. Use SST secrets.
- Webhooks: verify signatures (e.g., Stripe), handle idempotency.

## Environment

- Access env vars via `env` export from `@repo/config`.
- Add secrets with `/add-env` skill or `bun backend env:add KEY "dev-val" "prod-val"` + export in `infra/secrets.ts`.

## Observability

- Structured logs via `@repo/logs` (pino). Bounded retries with timeouts for transient failures. Idempotent operations.

## Testing

- Run tests with the `/test-backend` skill.
- Co-locate tests next to source: `routes/billing.ts` → `routes/billing.test.ts`.
- Integration-style: real routes, real DB (isolated SQLite). Mock only external services.
- Use `trpcFactory.createRouter()` from `@/tests/factories` for route tests.
- For patterns and a full example, see `.claude/docs/backend-testing.md`.

## Review & CI

- No lint or type errors. Keep public types stable.
- Scoped changes — don't mix refactors with behavior changes.
- Add/adjust tests alongside changes. Green tests before merging.
