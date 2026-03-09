// oxlint-disable ban-ts-comment
// @ts-nocheck - The types in this file are only available after running tests once
import { PGlite } from '@electric-sql/pglite';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { PrismaPGlite } from 'pglite-prisma-adapter';

import { PrismaClient } from '../../../../node_modules/.prisma-test/client';

// Create an in-memory PGlite instance per worker (each vitest worker imports this fresh)
const client = new PGlite();
const adapter = new PrismaPGlite(client);

/** Initialize our test prisma client with PGlite driver adapter */
const db = new PrismaClient({ adapter }) as unknown as PrismaClientType;

export { client, db };
