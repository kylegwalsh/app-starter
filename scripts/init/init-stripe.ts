import { getDomain, setupStripe } from './init.js';

/** Initialize Stripe configuration */
const initStripe = async () => {
  console.log('Preparing Stripe setup...\n');

  // Get the domain details from the user
  const domain = await getDomain();

  // Setup Stripe
  await setupStripe({ domain });
};

initStripe();
