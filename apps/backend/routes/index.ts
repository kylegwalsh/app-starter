import { t } from './trpc/init';
import { publicProcedure } from './trpc/procedures';
import { db } from '@/db';

/** The actual router used to handle all tRPC traffic */
export const router = t.router({
  test: publicProcedure.query(async () => {
    const result = await db.settings.count();
    return `Hello, world! ${result}`;
  }),
});

/**
 * The type of our backend router
 *
 * (only export *type signature* of router
 * to avoid accidentally importing your API
 * into client-side code)
 */
export type AppRouter = typeof router;
