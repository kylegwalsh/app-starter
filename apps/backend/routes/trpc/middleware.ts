import { log } from '@repo/logs';

import { t } from './init';

/** Times the procedure */
export const timeProcedure = t.middleware(async ({ path, type, next }) => {
  log.info({ trpc: { path, type } }, `Starting request to "${path}"`);
  const start = Date.now();

  // Wait for the procedure to complete
  const result = await next();

  // Determine how long it took to complete the procedure
  const durationMs = Date.now() - start;

  if (result.ok) {
    log.info(
      {
        trpc: { path, type },
        durationMs,
      },
      `Request to "${path}" completed in ${durationMs}ms`
    );
  } else {
    log.error(
      {
        trpc: { path, type },
        durationMs,
      },
      `Request to "${path}" failed in ${durationMs}ms`
    );
  }

  return result;
});
