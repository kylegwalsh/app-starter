import { z } from 'zod';

/** Schemas for billing */
export const billingSchema = {
  /** Schema for a one-time Stripe checkout */
  checkout: z.object({
    /** Amount in dollars (will be converted to cents) */
    amount: z.number().positive(),
    /** Description shown on the Stripe checkout page */
    description: z.string(),
    /** URL to redirect to after successful payment */
    successUrl: z.url(),
    /** URL to redirect to if the user cancels */
    cancelUrl: z.url(),
  }),
};
