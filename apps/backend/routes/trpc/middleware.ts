import { t } from './init';

/** Times the procedure */
export const timeProcedure = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;
  if (result.ok) {
    console.log('OK request timing:', { path, type, durationMs });
  } else {
    console.log('Non-OK request timing', { path, type, durationMs });
  }

  return result;
});
