import { orpc } from '@/core';
import { db } from '@/db';

import { publicProcedure } from '../procedures';

/** The health router */
export const healthRouter = orpc.router({
  /** Simple health check to verify the API is running */
  check: publicProcedure
    .route({
      method: 'GET',
      path: '/health',
      summary: 'Check the health of the API',
      tags: ['Health'],
    })
    .handler(async () => {
      await db.user.findFirst();
      return { status: 'ok' };
    }),
});
