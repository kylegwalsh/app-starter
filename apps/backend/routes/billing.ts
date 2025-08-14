import { config } from '@repo/config';
import { log } from '@repo/logs';

import { stripe } from '@/core';

import { t } from './trpc/init';
import { protectedProcedure } from './trpc/procedures';

/** The billing router */
export const billingRouter = t.router({
  /** Create a URL to allow users to view their billing details */
  getPortalUrl: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;

    // If the user doesn't have a Stripe customer ID, throw an error
    if (!user.stripeCustomerId) throw new Error('User does not have a Stripe customer ID');

    /** Create a stripe billing portal session so they can change their settings */
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${config.app.url}/settings/billing`,
    });

    return { url: session.url };
  }),
  /** Gets a list of all the user's invoices */
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;

    // If the user doesn't have a Stripe customer ID, return an empty array
    if (!user.stripeCustomerId) return { history: [] };

    try {
      // Get billing history from Stripe
      const [invoices, charges] = await Promise.all([
        stripe.invoices.list({
          customer: user.stripeCustomerId,
          limit: 100,
        }),
        stripe.charges.list({
          customer: user.stripeCustomerId,
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
      ].sort((a, b) => b.date.getTime() - a.date.getTime());

      return { history };
    } catch (error) {
      log.error({ error }, 'Error fetching Stripe billing history');
      return { history: [] };
    }
  }),
});
