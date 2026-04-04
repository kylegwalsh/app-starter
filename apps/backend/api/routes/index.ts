import { billingRouter } from './billing';
import { healthRouter } from './health';

/** The router used to handle all API traffic */
export const router = {
  billing: billingRouter,
  health: healthRouter,
};

/**
 * The type of our backend router
 *
 * Note: This is shared with the frontend by generating the types
 * and configuring our tsconfig intelligently
 */
export type AppRouter = typeof router;
