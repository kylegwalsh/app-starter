import { API_MAX_TIMEOUT_MS } from '@repo/constants';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

/**
 * Buffer before the hard timeout to throw a soft timeout error. Leaves room for
 * the error handler to capture the exception, flush logs, and return a clean
 * 504 response before AWS terminates the Lambda.
 */
const TIMEOUT_BUFFER_MS = 5000;
const SOFT_TIMEOUT_MS = API_MAX_TIMEOUT_MS - TIMEOUT_BUFFER_MS;

/**
 * Throws a 504 just before the Lambda/API Gateway hard timeout fires so the
 * error handler can report the failure and return a clean response instead of
 * AWS forcibly killing the invocation. The hard timeout comes from the same
 * shared constant `infra/api.ts` uses to configure the Lambda + integration,
 * so the runtime and infra always agree.
 *
 * Note: this only protects non-streaming responses. Streaming routes return a
 * `Response` quickly and produce bytes after `next()` resolves, so the timer
 * is cleared before the stream finishes regardless of how long it runs.
 */
export const timeoutMiddleware = createMiddleware(async (c, next) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new HTTPException(504, {
          message: `Request exceeded ${SOFT_TIMEOUT_MS}ms timeout`,
        }),
      );
    }, SOFT_TIMEOUT_MS);
  });
  try {
    await Promise.race([next(), timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
});
