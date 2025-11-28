# Backend

This app provides the serverless backend for the monorepo. It is built with SST (AWS), Hono, tRPC (with OpenAPI generation), Prisma/Postgres, and Better Auth. It exposes:

- tRPC endpoints under `/trpc`
- REST endpoints (generated from tRPC via OpenAPI metadata) under `/api`
- Swagger UI for the generated OpenAPI spec at `/docs`
- Auth routes handled by Better Auth under a dedicated Lambda entry `/api/auth`

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Running Locally](#running-locally)
- [Deploying](#deploying)
- [Infrastructure](#infrastructure)
- [API Entrypoints](#api-entrypoints)
- [Auth](#auth)
- [Database](#database)
  - [Migrations](#migrations)
- [Testing](#testing)
- [Scripts](#scripts)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- **Runtime/Infra**: SST deploys AWS Lambda + API Gateway. Common Lambda concerns (logging, analytics, AI tracing) are wrapped via `withLambdaContext`.
- **API**: A central `router` composes feature routers (e.g., `billing`) using tRPC. We also expose REST via `better-trpc-openapi` and serve Swagger.
- **Auth**: [Better Auth](https://better-auth.com/) with Prisma adapter. Organizations are first-class; each user maintains a default/active organization. Optional personal organizations are supported and auto-provisioned.
- **DB**: Prisma client against Postgres. Schema lives in `db/schema.prisma`.

## Directory Structure

```text
apps/backend/
├── core/              # Any core logic shared across the backend (stripe, auth, etc)
├── db/                # Prisma schema and client wiring
│   ├── schema.prisma  # Our database schema
│   └── connect.ts     # PrismaClient init using env.DATABASE_URL
├── routes/            # tRPC routers and wiring
│   ├── index.ts       # Root tRPC router composition
│   └── trpc/          # tRPC init, context, middleware, procedures
│       ├── context.ts     # Builds Context { user, organization, etc }
│       ├── middleware.ts  # tRPC middleware (timing, auth enforcement, etc)
│       ├── procedures.ts  # tRPC procedures (public, protected, etc)
│       └── error.ts       # tRPC error handling and reporting
├── functions/         # Lambda entrypoints
│   ├── api.ts         # Multi-router handler for /trpc, /api, /docs
│   └── auth.ts        # Hono-based Better Auth handler for /api/auth
├── scripts/           # Local scripts (secrets, migrations, helpers)
├── tests/             # Vitest setup, mocks, and API/core tests
└── package.json
```

## Running Locally

From the repo root, start SST which also starts the backend:

```sh
bun dev
```

## Deploying

From the repo root, you can deploy the infrastructure and apps with SST:

```sh
bun run deploy
```

## Infrastructure

Infrastructure is managed by SST. See the root-level `sst.config.ts` and the `infra/` directory for stacks and deployment configuration (API, web, secrets, etc.).

## API Entrypoints

- `functions/api.ts`
  - Delegates to:
    - tRPC handler for paths starting with `/trpc`
    - REST handler (OpenAPI) for paths starting with `/api`
    - Inlined Swagger UI at `/docs` (generated from the tRPC router)

- `functions/auth.ts`
  - Hono app that forwards all `GET`/`POST` requests to `auth.handler` (Better Auth).

## Auth

Authentication is managed by Better Auth.

- `core/auth.ts`: Central config for Better Auth (Prisma adapter, secrets, cookie settings) plus auth-event webhooks (e.g., user/org lifecycle, password reset email hooks, analytics).
- Routes: Auth HTTP routes are exposed under `/api/auth` (handled via Hono and forwarded to `auth.handler`).
- Context: `routes/trpc/context.ts` parses the Better Auth cookie from the Lambda event to populate `user` and the active `organization` for requests.

## Database

Data is persisted with Prisma and Postgres. The schema is defined in `db/schema.prisma`, and the Prisma client is initialized in `db/connect.ts`.

### Migrations

You can iterate locally and see schema changes while developing using the standard `bun dev` flow. Before opening a PR, ensure your schema changes are captured in a migration by running:

```sh
bun db:migrate
```

This command launches an interactive helper with two options:

- Sync your local state (schema change)
  - Spins up a temporary Postgres shadow DB in Docker.
  - Diffs `db/schema.prisma` against existing migrations.
  - Generates an up migration at `db/migrations/<timestamp>_<name>/migration.sql` and a corresponding `migration-down.sql`.
  - Marks the migration as applied (keeps your DB and migrations in sync locally).
  - Requires Docker to be running.
- Generate a migration from scratch (manual data migration)
  - Creates a migration file without applying it so you can edit complex data changes by hand.
  - After editing, apply with `bun db:migrate:deploy`.

Additional commands:

- `bun db:migrate:deploy`: Applies pending migrations to the target database.
- `bun db:migrate:validate`: Used in CI to ensure schema and migrations are in sync. If migration creation prompts for input, CI fails.

> During CI, migrations are automatically validated and applied. The pipeline runs `bun db:migrate:validate` to confirm your schema changes are captured and then `bun db:migrate:deploy` to apply migrations to the correct database/environment.

## Testing

We use Vitest for testing. We focus on integration-style testing by leveraging mocks and spinning up the actual tRPC server.

- **Runner**: Vitest
- **DB boundary**: `@/db` is swapped to a SQLite-backed client during tests
- **Setup/teardown**: generate the client, clean state between tests, disconnect on finish

You can run tests by using one of the following commands:

```sh
bun backend run test
bun backend run test:ui
```

## Scripts

Key `package.json` scripts:

- `auth:generate`: Regenerates `db/schema.prisma` fields from Better Auth config.
- `db:*`: Helpers for Prisma (push, migrate, studio, generate).
- `add-secret`: Interactive helper to add new backend secrets.
