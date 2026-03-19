import type { StripePlan } from '@better-auth/stripe';

/** Our plan type (includes better auth plan details and custom plan details) */
export type Plan = StripePlan & {
  /** The title of the plan */
  title: string;
  /** The monthly price of the plan paid monthly */
  price: number;
  /** The monthly price of the plan paid annually */
  annualPrice: number;
};

/** The list of plans available in our app */
export const plans = Object.freeze({
  free: {
    name: 'free',
    title: 'Free',
    price: 0,
    annualPrice: 0,
    priceId: '',
    annualDiscountPriceId: '',
  },
  pro: {
    name: 'pro',
    title: 'Pro',
    price: 50,
    annualPrice: 40,
    priceId: 'GET_FROM_STRIPE',
    annualDiscountPriceId: 'GET_FROM_STRIPE',
  },
  enterprise: {
    name: 'enterprise',
    title: 'Enterprise',
    price: 100,
    annualPrice: 80,
    priceId: 'GET_FROM_STRIPE',
    annualDiscountPriceId: 'GET_FROM_STRIPE',
  },
}) satisfies Record<string, Plan>;
