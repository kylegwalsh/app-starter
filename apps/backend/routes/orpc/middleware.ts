import { os } from '@orpc/server';
import { ai } from '@repo/ai';
import { log } from '@repo/logs';

/** Times the procedure */
export const timeProcedure = os.middleware(async ({ path, next }) => {
  const routePath = path.join('.');
  log.info(`Starting request to "${routePath}"`);
  const start = Date.now();

  const result = await next({});

  const durationMs = Date.now() - start;
  log.info(`Request to "${routePath}" completed in ${durationMs}ms`);

  return result;
});

/** Automatically intercepts the response and uses it to update our AI trace metadata */
export const updateAiTrace = os.middleware(async ({ next }) => {
  const result = await next({});

  // Update the AI trace with the output of our request
  ai.updateRequestTrace({
    output: result.output,
  });

  return result;
});
