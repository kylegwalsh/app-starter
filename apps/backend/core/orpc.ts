import { os } from '@orpc/server';

/** Base oRPC builder */
export const orpc = os
  // Apply the basic context to our oRPC builder
  .$context<{ headers: Headers }>()
  // Add our most common error types so they're accessible to all procedures
  .errors({
    UNAUTHORIZED: {
      status: 401,
      message: 'Unauthorized',
    },
    NOT_FOUND: {
      status: 404,
      message: 'Not Found',
    },
    BAD_REQUEST: {
      status: 400,
      message: 'Bad Request',
    },
    INTERNAL_SERVER_ERROR: {
      status: 500,
      message: 'Internal Server Error',
    },
    UNPROCESSABLE_ENTITY: {
      status: 422,
      message: 'Unprocessable Entity',
    },
    TOO_MANY_REQUESTS: {
      status: 429,
      message: 'Too Many Requests',
    },
  });
