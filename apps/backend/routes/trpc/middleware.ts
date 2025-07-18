import { log } from '@repo/logs';
import { TRPCError } from '@trpc/server';

import { t } from './init';

/** Times the procedure */
export const timeProcedure = t.middleware(async ({ path, next }) => {
  log.info(`Starting request to "${path}"`);
  const start = Date.now();

  // Wait for the procedure to complete
  const result = await next();

  // Determine how long it took to complete the procedure
  const durationMs = Date.now() - start;

  if (result.ok) log.info(`Request to "${path}" completed in ${durationMs}ms`);
  else log.error(`Request to "${path}" failed in ${durationMs}ms`);

  return result;
});

/** Middleware that ensures the user is authenticated */
export const isAuthed = t.middleware(async ({ next, ctx }) => {
  // Ensure the user was correctly authed and parsed
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });

  // https://trpc.io/docs/v10/middlewares#context-swapping
  return next({
    ctx: {
      // General context
      ...ctx,
      // Narrow the type of the user since we know it exists
      user: ctx.user,
    },
  });
});
