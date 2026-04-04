# Backend Guidelines

## Stack

Node.js + TypeScript, SST (AWS Lambda), Hono, oRPC, Prisma (Postgres), Better Auth, Stripe, Vitest

## Directory Layout

```text
lambda/         Lambda entrypoints (api, crons)
api/            All of our API code (hono + oRPC)
api/routes/     oRPC routers (most new API work happens here)
api/middleware/ Hono middleware (CORS, timing)
api/adapters/   Protocol adapters (MCP)
mcp/            MCP server and tools
core/           Core services (auth, stripe, re-usable business logic helpers)
db/             Prisma schema, migrations, connection utilities
tests/          Vitest setup, factories, mocks (not test files — those live next to source)
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

- **Hono** is the unified HTTP entry point (`api/index.ts`). It handles non-API concerns first (auth, MCP, etc) then delegates to oRPC handlers.
- **oRPC** is where almost all API logic lives. New endpoints go in `api/routes/` using `protectedProcedure` or `publicProcedure` from `api/procedures.ts`. Do not add business logic in Hono routes directly.
- Two oRPC handlers serve the same router: **RPCHandler** (`/rpc/*`) for the typed frontend client, and **OpenAPIHandler** (`/api/*`) for external consumers and Swagger docs.

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
- Co-locate tests next to source: `api/routes/billing.ts` → `api/routes/billing.test.ts`.
- Integration-style: real routes, real DB (isolated SQLite). Mock only external services.
- Use `routerFactory.createRouter()` from `@/tests/factories` for route tests.
- For patterns and a full example, see `.claude/docs/backend-testing.md`.

## Review & CI

- No lint or type errors. Keep public types stable.
- Scoped changes — don't mix refactors with behavior changes.
- Add/adjust tests alongside changes. Green tests before merging.
