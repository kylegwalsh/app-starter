import { Hono } from 'hono';

import { authMiddleware } from '../middleware';

import { billingRouter } from './billing';
import { chatRouter } from './chat';
import { contactRouter } from './contact';
import { healthRouter } from './health';
import { uploadsRouter } from './uploads';

/**
 * The router used to handle all API traffic. Routes are chained in a single
 * expression so Hono can infer the full route map for the typed `hc` client.
 * `authMiddleware` populates the user/organization context for every route;
 * individual routers add `requireAuth` where a signed-in user is mandatory.
 */
export const router = new Hono()
  .use(authMiddleware)
  // Public routers must be mounted first — a router's `.use(requireAuth)` also applies to every route mounted after it
  .route('/', healthRouter)
  .route('/', contactRouter)
  // Protected routers
  .route('/', billingRouter)
  .route('/', chatRouter)
  .route('/', uploadsRouter);

/**
 * The type of our backend router
 *
 * Note: This is shared with the frontend by generating the types
 * and configuring our tsconfig intelligently
 */
export type AppRouter = typeof router;
