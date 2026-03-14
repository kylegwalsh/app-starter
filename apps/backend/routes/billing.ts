import { log } from '@repo/logs';

import { stripe } from '@/core';

import { base } from './orpc/base';
import { protectedProcedure } from './orpc/procedures';

/** The billing router */
export const billingRouter = base.prefix('/billing').router({
  /** Gets a list of all the organization's invoices */
  getHistory: protectedProcedure
    .route({
      method: 'GET',
      path: '/history',
      summary: 'Get billing history',
      tags: ['public', 'Billing'],
    })
    .handler(async ({ context }) => {
      const { organization } = context;

      // If the organization doesn't have a Stripe customer ID, return an empty array
      if (!organization.stripeCustomerId) {
        return { history: [] };
      }

      try {
        // Get billing history from Stripe
        const [invoices, charges] = await Promise.all([
          stripe.invoices.list({
            customer: organization.stripeCustomerId,
            limit: 100,
          }),
          stripe.charges.list({
            customer: organization.stripeCustomerId,
            limit: 100,
          }),
        ]);

        /** Combine and format the billing history */
        const history = [
          ...invoices.data.map((invoice) => ({
            id: invoice.id,
            amount: invoice.amount_paid / 100, // Convert from cents
            status: invoice.status,
            description: invoice.description || 'Invoice',
            date: new Date(invoice.created * 1000),
            receiptUrl: invoice.hosted_invoice_url,
            type: 'invoice',
          })),
          ...charges.data.map((charge) => ({
            id: charge.id,
            amount: charge.amount / 100, // Convert from cents
            status: charge.status,
            description: charge.description || 'Payment',
            date: new Date(charge.created * 1000),
            receiptUrl: charge.receipt_url,
            type: 'payment',
          })),
        ].toSorted((a, b) => b.date.getTime() - a.date.getTime());

        return { history };
      } catch (error) {
        log.error({ error }, 'Error fetching Stripe billing history');
        return { history: [] };
      }
    }),
});
