import type { Context } from "./context";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";

/** Initialized TRPC object */
export const t = initTRPC.context<Context>().create({
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
