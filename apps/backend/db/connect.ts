import { PrismaClient } from '@prisma/client';
import { env } from '@lib/config';

// Create env variable for prisma db connection
process.env['DATABASE_URL'] = env.DATABASE_URL;

/** Initialize our prisma client */
const db = new PrismaClient();

export { db };
