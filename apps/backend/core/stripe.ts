import { env } from '@repo/config';
import Stripe from 'stripe';

/** Our stripe client */
export const stripe = new Stripe((env as Record<string, string>).STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
});
