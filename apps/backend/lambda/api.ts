import { streamHandle, type LambdaContext } from 'hono/aws-lambda';

import { app } from '@/api';

import { withLambdaContext } from './utils';

/** The Lambda entry point into our API, using the stream handler so chat can stream responses */
export const handler: (
  event: unknown,
  context: LambdaContext,
  callback: (error?: unknown, result?: unknown) => void,
) => void | Promise<unknown> = withLambdaContext(streamHandle(app));
