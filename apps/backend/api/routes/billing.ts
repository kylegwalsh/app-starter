import { ORPCError } from '@orpc/server';
import { log } from '@repo/logs';
import { z } from 'zod';

import { stripe, orpc } from '@/core';

import { protectedProcedure } from '../procedures';

/** The billing router */
export const billingRouter = orpc.prefix('/billing').router({
  /**
   * Creates a one-time Stripe Checkout session for a fixed amount.
   * Returns a checkout URL to redirect the user to.
   */
  charge: protectedProcedure
    .route({
      method: 'POST',
      path: '/charge',
      summary: 'Create a Stripe checkout session',
      tags: ['Billing'],
    })
    .input(
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
    )
    .handler(async ({ context, input }) => {
      if (!stripe) {
        throw new ORPCError('NOT_FOUND', { message: 'Billing is not configured' });
      }

      const { organization } = context;
      const { amount, description, successUrl, cancelUrl } = input;

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

      return { url: session.url };
    }),

  /** Gets a list of all the organization's invoices */
  getHistory: protectedProcedure
    .route({
      method: 'GET',
      path: '/history',
      summary: 'Get billing history',
      tags: ['Billing'],
    })
    .handler(async ({ context }) => {
      const { organization } = context;

      // If Stripe isn't configured or the organization doesn't have a customer ID, return empty
      if (!stripe || !organization.stripeCustomerId) {
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
