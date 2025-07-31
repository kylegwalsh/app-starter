import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

import { auth } from '@/core';

/** Create a hono instance to handle routing for our auth routes */
const app = new Hono();
// Have better auth handle the request
app.on(['POST', 'GET'], '/**', async (c) => {
  try {
    const result = await auth.handler(c.req.raw);
    return result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[auth]', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/** The main entry point for the auth API */
export const handler = handle(app);
