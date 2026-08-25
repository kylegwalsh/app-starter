import type { Organization } from '@prisma/client';
import { log } from '@repo/logs';
import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import { stripe } from '@/core';

import { type ProtectedEnv, requireAuth } from '../middleware';

/** A single invoice or payment row in the billing history */
type BillingHistoryItem = {
  id: string | undefined;
  amount: number;
  status: string | null;
  description: string;
  date: Date;
  receiptUrl: string | null | undefined;
  type: 'invoice' | 'payment';
};

/**
 * Loads the organization's combined Stripe invoices and charges, newest first.
 * Returns an empty list when Stripe isn't configured, the organization has no
 * customer yet, or the Stripe lookup fails — billing history is informational,
 * so a failure shouldn't take the settings page down.
 */
const loadBillingHistory = async (organization: Organization): Promise<BillingHistoryItem[]> => {
  if (!stripe || !organization.stripeCustomerId) {
    return [];
  }

  try {
    const [invoices, charges] = await Promise.all([
      stripe.invoices.list({ customer: organization.stripeCustomerId, limit: 100 }),
      stripe.charges.list({ customer: organization.stripeCustomerId, limit: 100 }),
    ]);

    return [
      ...invoices.data.map((invoice) => ({
        id: invoice.id,
        amount: invoice.amount_paid / 100, // Convert from cents
        status: invoice.status,
        description: invoice.description || 'Invoice',
        date: new Date(invoice.created * 1000),
        receiptUrl: invoice.hosted_invoice_url,
        type: 'invoice' as const,
      })),
      ...charges.data.map((charge) => ({
        id: charge.id,
        amount: charge.amount / 100, // Convert from cents
        status: charge.status,
        description: charge.description || 'Payment',
        date: new Date(charge.created * 1000),
        receiptUrl: charge.receipt_url,
        type: 'payment' as const,
      })),
    ].toSorted((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    log.error({ err: error }, 'Error fetching Stripe billing history');
    return [];
  }
};

/** The billing router */
export const billingRouter = new Hono<ProtectedEnv>()
  .use(requireAuth)
  /**
   * Creates a one-time Stripe Checkout session for a fixed amount.
   * Returns a checkout URL to redirect the user to.
   */
  .post(
    '/billing/charge',
    describeRoute({
      summary: 'Create a Stripe checkout session',
      tags: ['Billing'],
    }),
    validator(
      'json',
      z.object({
        /** Amount in dollars (will be converted to cents) */
        amount: z.number().positive(),
        /** Description shown on the Stripe checkout page */
        description: z.string(),
        /** URL to redirect to after successful payment */
        successUrl: z.string().url(),
        /** URL to redirect to if the user cancels */
        cancelUrl: z.string().url(),
      }),
    ),
    async (c) => {
      if (!stripe) {
        throw new HTTPException(404, { message: 'Billing is not configured' });
      }

      const organization = c.get('organization');
      const { amount, description, successUrl, cancelUrl } = c.req.valid('json');

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: organization.stripeCustomerId ?? undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: Math.round(amount * 100),
              product_data: { name: description },
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      return c.json({ url: session.url });
    },
  )
  /** Gets a list of all the organization's invoices */
  .get(
    '/billing/history',
    describeRoute({
      summary: 'Get billing history',
      tags: ['Billing'],
    }),
    async (c) => {
      const history = await loadBillingHistory(c.get('organization'));
      return c.json({ history });
    },
  );
