import { analytics } from '@repo/analytics';
import { Hono } from 'hono';
import { handle } from 'hono/vercel';

import { auth, withVercelContext } from '@/core';

/** Create a hono instance to handle routing for our auth routes */
const app = new Hono();
// Have better auth handle the request
app.on(['POST', 'GET'], '/**', async (c) => {
  try {
    const result = await auth.handler(c.req.raw);
    return result;
  } catch (error) {
    await analytics.captureException(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/** The main entry point for the auth API */
export default withVercelContext(handle(app));
