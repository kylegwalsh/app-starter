import type { Context } from './context';
import { initTRPC } from '@trpc/server';
import type { OpenApiMeta } from 'better-trpc-openapi';
import superjson from 'superjson';

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
