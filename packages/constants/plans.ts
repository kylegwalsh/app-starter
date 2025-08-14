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
export const plans = {
  free: {
    name: 'free',
    title: 'Free',
    price: 0,
    annualPrice: 0,
    priceId: 'price_1RstZwF1kcHuFeSjmUap4a30',
    annualDiscountPriceId: 'price_1RstZwF1kcHuFeSjmUap4a30',
  },
  pro: {
    name: 'pro',
    title: 'Pro',
    price: 50,
    annualPrice: 40,
    priceId: 'price_1RstbzF1kcHuFeSjwYcZnY4Q',
    annualDiscountPriceId: 'price_1RstZwF1kcHuFeSjmUap4a30',
  },
  enterprise: {
    name: 'enterprise',
    title: 'Enterprise',
    price: 100,
    annualPrice: 80,
    priceId: 'price_1RstcDF1kcHuFeSjIe68lopS',
    annualDiscountPriceId: 'price_1RstZwF1kcHuFeSjmUap4a30',
  },
} as const satisfies Record<string, Plan>;
