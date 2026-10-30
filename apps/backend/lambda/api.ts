import { streamHandle, type LambdaContext } from 'hono/aws-lambda';

import { app } from '@/api';

import { withLambdaContext } from './utils';

/**
 * The Lambda entry point into our API. It uses the stream handler to
 * support streamed responses from the chat feature.
 */
export const handler: (
  event: unknown,
  context: LambdaContext,
  callback: (error?: unknown, result?: unknown) => void,
) => void | Promise<unknown> = withLambdaContext(streamHandle(app));
