import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

import { auth } from '@/core';

/** Create a hono instance to handle routing for our auth routes */
const app = new Hono();
// Have better auth handle the request
app.on(['POST', 'GET'], '/**', (c) => {
  try {
    return auth.handler(c.req.raw);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/** The main entry point for the auth API */
export const handler = handle(app);
