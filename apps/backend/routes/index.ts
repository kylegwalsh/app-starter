import { billingRouter } from './billing';
import { t } from './trpc/init';

/** The actual router used to handle all tRPC traffic */
export const router = t.router({
  billing: billingRouter,
});

/**
 * The type of our backend router
 *
 * Note: This is shared with the frontend by generating the types
 * and configuring our tsconfig intelligently
 */
export type AppRouter = typeof router;
