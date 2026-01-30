import { getDomain, setupStripe } from './init.js';

/** Initialize Stripe configuration */
const initStripe = async () => {
  console.log('Preparing Stripe setup...\n');

  // Get the domain details from the user
  const domain = await getDomain();

  // Setup Stripe
  await setupStripe({ domain });

  // End the script
  process.exit(0);
};

initStripe();
