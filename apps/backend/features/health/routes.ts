import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';

import { db } from '@/db';

/** The health router */
export const healthRouter = new Hono().get(
  '/',
  describeRoute({
    summary: 'Check the health of the API',
    tags: ['Health'],
    responses: {
      200: {
        description: 'The API is healthy',
        content: {
          'application/json': { schema: resolver(z.object({ status: z.literal('ok') })) },
        },
      },
    },
  }),
  async (c) => {
    await db.user.findFirst();
    return c.json({ status: 'ok' } as const);
  },
);
