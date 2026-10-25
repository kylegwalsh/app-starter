import { Hono } from 'hono';

import { billingRouter } from '@/features/billing/routes';
import { chatRouter } from '@/features/chat/routes';
import { contactRouter } from '@/features/contact/routes';
import { healthRouter } from '@/features/health/routes';
import { uploadsRouter } from '@/features/uploads/routes';

import { authMiddleware } from './middleware';

/** Every API route, chained in one expression so the typed `hc` client can infer them */
export const router = new Hono()
  .use(authMiddleware)
  // Public routers go first: a router's `.use(requireAuth)` also applies to routes mounted after it
  .route('/', healthRouter)
  .route('/', contactRouter)
  // Protected routers
  .route('/', billingRouter)
  .route('/', chatRouter)
  .route('/', uploadsRouter);

/** The API's type, shared with the frontend's typed client */
export type AppRouter = typeof router;
