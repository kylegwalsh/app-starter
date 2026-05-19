import { streamHandle } from 'hono/aws-lambda';

import { app } from '@/api';
import { withLambdaContext } from '@/core';

/**
 * Streaming Lambda entry point. `streamHandle` wraps the Hono app with
 * `awslambda.streamifyResponse`, and `withLambdaContext` copies the streaming
 * marker forward so the Lambda runtime keeps invoking us in streaming mode.
 */
export const handler = withLambdaContext(streamHandle(app));
