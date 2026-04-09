import { log } from '@repo/logs';
import { createMiddleware } from 'hono/factory';

/** Logs request timing for all routes */
export const timingMiddleware = createMiddleware(async (c, next) => {
  const path = c.req.path;
  const method = c.req.method;

  // Log the request start
  log.info(`Starting ${method} "${path}"`);
  const start = Date.now();

  // Wait for the request to complete
  await next();

  // Determine the log level based on the response status
  let logLevel: keyof typeof log = 'info';
  if (c.res.status >= 500) {
    logLevel = 'error';
  } else if (c.res.status >= 400) {
    logLevel = 'warn';
  }

  // Log the request completion
  const durationMs = Date.now() - start;
  log[logLevel]({ status: c.res.status }, `${method} "${path}" completed in ${durationMs}ms`);
});
