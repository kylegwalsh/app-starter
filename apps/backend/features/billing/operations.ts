import { log } from '@repo/logs';
import type { billingSchema } from '@repo/schemas';
import type { z } from 'zod';

import { NotFoundError } from '@/api/error';
import { type AuthContext, stripe } from '@/services';

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

/** Creates a one-time Stripe Checkout session for a fixed amount and returns the URL */
export const createCheckoutSession = async (
  { amount, description, successUrl, cancelUrl }: z.infer<typeof billingSchema.checkout>,
  { organization }: AuthContext,
) => {
  if (!stripe) {
    throw new NotFoundError('Billing is not configured');
  }

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
};

/** Loads the organization's combined Stripe invoices and charges */
export const getBillingHistory = async ({
  organization,
}: AuthContext): Promise<BillingHistoryItem[]> => {
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
