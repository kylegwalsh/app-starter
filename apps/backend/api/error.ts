import { ORPCError } from '@orpc/client';
import { analytics } from '@repo/analytics';
import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

/** Shared error handler — decides whether to log and report based on the error + status */
export const handleError = async ({ error }: { error: unknown }) => {
  /** Determine the status code from the error */
  const status = error instanceof HTTPException || error instanceof ORPCError ? error.status : 500;

  // If the server error is 5xx, we will track and log it
  if (status >= 500) {
    await analytics.captureException(error instanceof Error ? (error.cause ?? error) : error);
  }
};

/** Hono error handler — handles HTTP errors and reports them to analytics */
export const handleHonoError: ErrorHandler = async (error, c) => {
  // Handle the error and report it if it's a server error
  await handleError({ error });

  // Return the appropriate HTTP response
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }

  // Fallback to a 500 error
  return c.json({ error: 'Internal server error' }, 500);
};
