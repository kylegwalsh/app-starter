/* eslint-disable */
// @ts-nocheck - The types in this file are only available after running tests once
import { PrismaClient } from '../../../../node_modules/.prisma-test/client';

/** Initialize our test prisma client */
const db = new PrismaClient();

export { db };
