import type { Context } from "./context";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { OpenApiMeta } from "better-trpc-openapi";

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
