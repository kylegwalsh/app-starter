import { setupStripe } from './init.js';

/** Initialize Stripe configuration */
const initStripe = async () => {
  await setupStripe();
};

void initStripe();
