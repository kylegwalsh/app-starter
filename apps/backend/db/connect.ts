import { PrismaClient } from '@prisma/client';

/** Initialize our prisma client */
const db = new PrismaClient();

export { db };
