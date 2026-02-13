// oxlint-disable ban-ts-comment
// @ts-nocheck - The types in this file are only available after running tests once
import path from 'node:path';

import type { PrismaClient as PrismaClientType } from '@prisma/client';

import { PrismaClient } from '../../../../node_modules/.prisma-test/client';

// Each Vitest worker gets a unique VITEST_POOL_ID — use it to isolate SQLite databases per worker
const poolId = process.env.VITEST_POOL_ID ?? '0';
const dbPath = path.resolve(import.meta.dirname, `../generated/test-${poolId}.db`);

/** Initialize our test prisma client */
const db = new PrismaClient({
  datasources: { db: { url: `file:${dbPath}` } },
}) as unknown as PrismaClientType;

export { db };
