import { billingRouter } from './billing';
import { conversationsRouter } from './conversations';
import { healthRouter } from './health';
import { uploadsRouter } from './uploads';

/** The router used to handle all API traffic */
export const router = {
  billing: billingRouter,
  conversations: conversationsRouter,
  health: healthRouter,
  uploads: uploadsRouter,
};

/**
 * The type of our backend router
 *
 * Note: This is shared with the frontend by generating the types
 * and configuring our tsconfig intelligently
 */
export type AppRouter = typeof router;
