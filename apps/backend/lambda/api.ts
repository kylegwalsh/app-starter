import { streamHandle, type LambdaContext } from 'hono/aws-lambda';

import { app } from '@/api';
import { withLambdaContext } from '@/core';

/**
 * Streaming Lambda entry point. `streamHandle` wraps the Hono app with
 * `awslambda.streamifyResponse`, and `withLambdaContext` copies the streaming
 * marker forward so the Lambda runtime keeps invoking us in streaming mode.
 *
 * The signature is written out because Hono doesn't re-export the internal
 * `Handler` type its adapter infers, which declaration emit can't name.
 */
export const handler: (
  event: unknown,
  context: LambdaContext,
  callback: (error?: unknown, result?: unknown) => void,
) => void | Promise<unknown> = withLambdaContext(streamHandle(app));
