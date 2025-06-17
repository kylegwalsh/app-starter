import { log } from '@repo/logs';

import { db } from '@/db';

import { t } from './trpc/init';
import { publicProcedure } from './trpc/procedures';

const myErrorMethod = () => {
  throw new Error('test');
};

/** The actual router used to handle all tRPC traffic */
export const router = t.router({
  test: publicProcedure.query(async () => {
    const count = await db.settings.count();
    log.info('test', { count: 5 });
    return count;
  }),
  error: publicProcedure.mutation(() => {
    myErrorMethod();
  }),
});

/**
 * The type of our backend router
 *
 * Note: This is shared with the frontend by generating the types
 * and configuring our tsconfig intelligently
 */
export type AppRouter = typeof router;
