// oxlint-disable ban-ts-comment
// @ts-nocheck - The types in this file are only available after running tests once
import type { PrismaClient as PrismaClientType } from '@prisma/client';

import { PrismaClient } from '../../../../node_modules/.prisma-test/client';

/** Initialize our test prisma client */
const db = new PrismaClient() as unknown as PrismaClientType;

export { db };
