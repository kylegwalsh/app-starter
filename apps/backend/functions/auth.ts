import { log } from '@repo/logs';
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

import { auth, withLambdaContext } from '@/core';

/** Create a hono instance to handle routing for our auth routes */
const app = new Hono();
// Have better auth handle the request
app.on(['POST', 'GET'], '/**', async (c) => {
  try {
    const result = await auth.handler(c.req.raw);
    return result;
  } catch (error) {
    log.error({ error }, '[auth]');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/** The main entry point for the auth API */
// @ts-expect-error - The event type for the handler is slightly different from the true AWS event type
export const handler = withLambdaContext<'api'>(handle(app));
