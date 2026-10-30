# Backend

This app provides the serverless backend for the monorepo. It is built with SST (AWS), Hono, Prisma/Postgres, and Better Auth. It exposes:

- REST endpoints under `/api`, consumed by the frontend through Hono's typed `hc` client
- Swagger UI for the generated OpenAPI spec at `/api` (local dev only)
- Auth routes handled by Better Auth under `/api/auth`
- AI chat streaming at `/api/chat` (Vercel AI SDK `useChat` compatible)
- MCP server at `/mcp` (needs a custom domain)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Running Locally](#running-locally)
- [Deploying](#deploying)
- [Infrastructure](#infrastructure)
- [API Entrypoints](#api-entrypoints)
- [MCP Server](#mcp-server)
  - [Adding a new tool](#adding-a-new-tool)
  - [Connecting an MCP client](#connecting-an-mcp-client)
- [Auth](#auth)
- [Database](#database)
  - [Migrations](#migrations)
- [Testing](#testing)
- [Scripts](#scripts)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- **Runtime/Infra**: SST deploys AWS Lambda + API Gateway. Common Lambda concerns (logging, analytics, AI tracing) are wrapped via `withLambdaContext`.
- **HTTP Layer**: Hono is the unified HTTP entry point. It handles non-API concerns (auth, MCP, etc) then mounts the API router under `/api`.
- **API**: A central `router` composes feature routers (e.g., `billing`) as chained Hono routes. The same routes serve both the frontend's typed `hc` client and the generated OpenAPI spec — `hono-openapi`'s `validator` validates requests and documents them in one step.
- **Auth**: [Better Auth](https://better-auth.com/) with Prisma adapter. Organizations are first-class; each user maintains a default/active organization. Optional personal organizations are supported and auto-provisioned.
- **DB**: Prisma client against Postgres. Schema lives in `db/schema.prisma`.

## Directory Structure

```text
apps/backend/
├── lambda/            # Lambda entrypoints (api, crons)
│   ├── api.ts         # Main Lambda handler
│   └── crons/         # Scheduled Lambda functions
├── api/               # All API code (Hono)
│   ├── index.ts       # Hono app
│   ├── router.ts      # Mounts every feature router
│   ├── error.ts       # Shared error handling
│   ├── docs.ts        # Swagger UI config, login page
│   ├── middleware/    # Hono middleware (auth, CORS, timing, timeout)
│   └── adapters/      # Protocol adapters (MCP)
├── features/          # Vertical slices: routes, operations, tools (most new work happens here)
├── ai/                # Tool registry, AI SDK + MCP adapters, MCP server
├── services/          # External integrations (auth, stripe, storage, daytona)
├── db/                # Prisma schema and client wiring
│   └── schema.prisma  # Database schema
├── tests/             # Vitest setup, factories, mocks
├── scripts/           # Local scripts (secrets, migrations, helpers)
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

- `lambda/api.ts` — Single Lambda that runs the Hono app, which delegates to:
  - Better Auth for `/api/auth/*`
  - MCP adapter for `/mcp/*`
  - Swagger login page at `/api/login`
  - Feature routers at `/api/*` (typed `hc` client, Swagger docs)

## MCP Server

The backend includes a [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server at `/mcp`. This allows AI assistants like Claude, Cursor, and other MCP-compatible clients to interact with your app through typed tools.

- **Auth**: Uses Better Auth's OAuth provider plugin — clients authenticate via standard OAuth 2.0 flow and receive a JWT access token.
- **Tools**: Defined in the owning feature's `tools.ts` (e.g. `features/organization/tools.ts`). Each tool uses `createTool` from `ai/utils.ts` for type-safe input schemas and session access.
- **Auto-registration**: Tool files re-exported from `ai/tools.ts` are registered automatically on the MCP server and/or in chat, depending on each tool's `consumers`.

### Adding a new tool

1. Add it to the owning feature's `tools.ts` (see `features/organization/tools.ts` for reference).
2. Export the file from `ai/tools.ts`.

See [`ai/README.md`](ai/README.md) for the full walkthrough.

### Connecting an MCP client

> **MCP needs a custom domain.** Without one, the API is on API Gateway's default URL, which puts the stage in the path. MCP clients look for OAuth metadata at the domain root (`/.well-known/...`), which that URL can't serve.

The repo's `.mcp.json` already includes the server for Claude Code. It runs `scripts/mcp.ts`, which reads your stage's API URL from `.sst/outputs.json` (written by `bun dev` / `bun deploy`) and connects through [mcp-remote](https://www.npmjs.com/package/mcp-remote), which handles the OAuth sign-in.

For other clients (Cursor, Claude Desktop), point them at `https://api.<your-domain>/mcp`. They authenticate via OAuth on first connection.

## Auth

Authentication is managed by Better Auth.

- `services/auth.ts`: Central config for Better Auth (Prisma adapter, secrets, cookie settings) plus auth-event webhooks (e.g., user/org lifecycle, password reset email hooks, analytics).
- Routes: Auth HTTP routes are exposed under `/api/auth` (handled via Hono and forwarded to `auth.handler`).
- Context: `api/middleware/auth.ts` parses the Better Auth cookie from request headers to populate `user` and the active `organization` on the Hono context. Routers that require a signed-in user apply `requireAuth`.

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

We use Vitest for testing. We focus on integration-style testing by dispatching requests in-process against the actual Hono router.

- **Runner**: Vitest
- **DB boundary**: `@/db` is swapped to a PGlite-backed client during tests
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
- `env:add`: Interactive helper to add new backend secrets.
