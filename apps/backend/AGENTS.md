# Backend Guidelines

## Stack

Node.js + TypeScript, SST (AWS Lambda), Hono (+ hono-openapi), Prisma (Postgres), Better Auth, Stripe, Vitest

## Directory Layout

```text
lambda/         Lambda entrypoints (api, crons)
api/            The wiring for our Hono API
features/       Vertical slices, one folder per feature domain:
  routes.ts       Hono router: validate input → call an operation → respond
  operations.ts   Business logic (DB work + decisions)
  tools.ts        AI tools for chat/MCP (registered in `ai/tools.ts`)
  lib/            Any additional helpers (use when operations gets too unwieldy)
ai/             Tool registry, AI SDK + MCP tool adapters, MCP server
services/       External integrations (auth, stripe, storage, daytona)
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
- **Validation**: Request body schemas live in `@repo/schemas` (shared with the frontend); routes validate with them and operations type their input with `z.infer`. Small route-only inputs (path params, pagination queries) can stay inline on the route.

## API & Routing

- **Hono** is the unified HTTP entry point (`api/index.ts`). It handles non-API concerns first (auth, MCP, etc) then mounts the API router under `/api`.
- New endpoints go in `features/<feature>/routes.ts` and are mounted in `api/router.ts`. Mount public routers before protected ones — a router's `.use(requireAuth)` also applies to every route mounted after it. Chain routes off a single `new Hono<ProtectedEnv>().use(requireAuth)` expression — chaining is what lets the frontend's `hc` client infer types, so never split a router into separate statements.
- Each route takes `describeRoute({ summary, tags })` for the OpenAPI spec, then `validator('json' | 'query' | 'param', schema)` (from `hono-openapi`) which both validates and documents the input. Read validated input with `c.req.valid('json')`.
- Keep handlers thin: validate, call an operation, respond. Pass `c.var` (an `AuthContext` of `user` + `organization`, non-optional on routers that applied `requireAuth`) to operations so they work without HTTP (tests, MCP tools, crons).
- Throw `HTTPException` from `hono/http-exception` for errors (404 not found, 409 conflict, etc). The global `onError` handler reports them.

## Database

- Prisma is source of truth. Local dev: `bun backend db:push`. Production: `bun backend db:migrate`.
- After schema changes run `bun backend db:generate`. Never run migrations directly.
- Prefer Prisma query builders. Raw SQL only when necessary, always parameterized.
- Group multi-step mutations in transactions. Add indexes for frequently queried fields.

## Auth & Security

- Better Auth: identity + org membership derived in request context, enforced via middleware (`authMiddleware` + `requireAuth`).
- Never log secrets or expose API keys to frontend. Use SST secrets.
- Webhooks: verify signatures (e.g., Stripe), handle idempotency.

## Environment

- Access env vars via `env` export from `@repo/config`.
- Add secrets with `/add-env` skill or `bun backend env:add KEY "dev-val" "prod-val"` + export in `infra/secrets.ts`.

## Observability

- Structured logs via `@repo/logs` (pino). Bounded retries with timeouts for transient failures. Idempotent operations.

## Testing

- Run tests with the `/test-backend` skill.
- Co-locate tests next to source: `features/billing/routes.ts` → `features/billing/routes.test.ts`.
- Integration-style: real routes, real DB (isolated SQLite). Mock only external services.
- Use `sessionFactory.createSession()` from `@/tests/factories` for route tests (signed-in user + org + `api` client).
- Use `mcpFactory.createClient()` for MCP tool tests (a real MCP client connected to our server in memory, with `callTool`).
- For patterns and a full example, see `.claude/docs/backend-testing.md`.

## Review & CI

- No lint or type errors. Keep public types stable.
- Scoped changes — don't mix refactors with behavior changes.
- Add/adjust tests alongside changes. Green tests before merging.
