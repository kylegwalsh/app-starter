import { billingRouter } from './billing';

/** The router used to handle all API traffic */
export const router = {
  billing: billingRouter,
};

/**
 * The type of our backend router
 *
 * Note: This is shared with the frontend by generating the types
 * and configuring our tsconfig intelligently
 */
export type AppRouter = typeof router;
