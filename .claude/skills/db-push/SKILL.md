---
name: db-push
description: Push Prisma schema changes to the local database. Use after modifying the Prisma schema.
disable-model-invocation: true
allowed-tools: Bash(bun backend db:push), Bash(bun backend db:generate)
---

Push Prisma schema changes to the local database and regenerate the client.

## Steps

1. Run `bun backend db:push` (this will also re-generate the Prisma client)
