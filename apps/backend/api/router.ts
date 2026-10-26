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
  .route('/health', healthRouter)
  .route('/contact', contactRouter)
  .route('/billing', billingRouter)
  .route('/chat', chatRouter)
  .route('/uploads', uploadsRouter);

/** The API's type, shared with the frontend's typed client */
export type AppRouter = typeof router;
