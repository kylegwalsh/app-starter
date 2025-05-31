import { initTRPC } from '@trpc/server';
import { OpenApiMeta } from 'better-trpc-openapi';
import superjson from 'superjson';

import type { Context } from './context';

/** Initialized TRPC object */
export const t = initTRPC
  .meta<OpenApiMeta>()
  .context<Context>()
  .create({
    transformer: superjson,
    errorFormatter({ shape }) {
      return {
        ...shape,
        data: {
          ...shape.data,
        },
      };
    },
  });
