import Stripe from 'stripe';

/** Our stripe client */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});
