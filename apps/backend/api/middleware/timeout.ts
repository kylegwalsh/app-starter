import { API_SOFT_TIMEOUT_MS } from '@repo/constants';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

/** Throws a 504 just before the hard timeout so the error handler can respond cleanly */
export const timeoutMiddleware = createMiddleware(async (c, next) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new HTTPException(504, {
          message: `Request exceeded ${API_SOFT_TIMEOUT_MS}ms timeout`,
        }),
      );
    }, API_SOFT_TIMEOUT_MS);
  });
  try {
    // Streaming routes return a Response before the body finishes, so they handle their own timeout
    await Promise.race([next(), timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
});
