import { billingSchema } from '@repo/schemas';
import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';

import { type ProtectedEnv, requireAuth } from '@/api/middleware';

import { createCheckoutSession, getBillingHistory } from './operations';

/** The billing router */
export const billingRouter = new Hono<ProtectedEnv>()
  .use(requireAuth)
  /** Creates a one-time Stripe Checkout session and returns its URL */
  .post(
    '/billing/charge',
    describeRoute({
      summary: 'Create a Stripe checkout session',
      tags: ['Billing'],
    }),
    validator('json', billingSchema.checkout),
    async (c) => c.json(await createCheckoutSession(c.req.valid('json'), c.var)),
  )
  /** Gets a list of all the organization's invoices */
  .get(
    '/billing/history',
    describeRoute({
      summary: 'Get billing history',
      tags: ['Billing'],
    }),
    async (c) => c.json({ history: await getBillingHistory(c.var) }),
  );
