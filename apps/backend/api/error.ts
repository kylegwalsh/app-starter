import { analytics } from '@repo/analytics';
import { log } from '@repo/logs';
import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

// ---------- ERROR CLASSES ----------
// Expected failures the caller can fix. They're returned to the caller (an HTTP response, or an
// error result for the model) and logged, but not reported as exceptions.

/** 400: the input is invalid or not allowed */
export class BadRequestError extends HTTPException {
  constructor(message: string) {
    super(400, { message });
    this.name = 'BadRequestError';
  }
}

/** 401: the caller isn't signed in */
export class UnauthorizedError extends HTTPException {
  constructor(message = 'Unauthorized') {
    super(401, { message });
    this.name = 'UnauthorizedError';
  }
}

/** 403: the caller is signed in but can't access this */
export class ForbiddenError extends HTTPException {
  constructor(message: string) {
    super(403, { message });
    this.name = 'ForbiddenError';
  }
}

/** 404: the resource doesn't exist (or the caller can't see it) */
export class NotFoundError extends HTTPException {
  constructor(message: string) {
    super(404, { message });
    this.name = 'NotFoundError';
  }
}

/** 409: the request conflicts with the resource's current state */
export class ConflictError extends HTTPException {
  constructor(message: string) {
    super(409, { message });
    this.name = 'ConflictError';
  }
}

/** 422: the input was valid but couldn't be processed (e.g. the model's code failed) */
export class UnprocessableError extends HTTPException {
  constructor(message: string) {
    super(422, { message });
    this.name = 'UnprocessableError';
  }
}

// ---------- HANDLERS ----------
/** The HTTP status an error maps to (anything unexpected is a 500) */
export const getErrorStatus = (error: unknown) =>
  error instanceof HTTPException ? error.status : 500;

/** Shared error handler — reports unexpected errors and logs expected (4xx) ones */
export const handleError = async ({
  error,
  properties,
}: {
  error: unknown;
  properties?: Record<string, unknown>;
}) => {
  const status = getErrorStatus(error);

  // A 4xx is the caller's mistake: keep a trail, but don't report it
  if (status < 500) {
    log.warn(
      { ...properties, status, err: error },
      error instanceof Error ? error.message : 'Client error',
    );
    return;
  }

  await analytics.captureException(
    error instanceof Error ? (error.cause ?? error) : error,
    properties,
  );
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
