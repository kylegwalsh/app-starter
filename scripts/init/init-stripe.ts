import { getDomain, printStripeFinalNotes, setupStripe } from './init.js';

/** Initialize Stripe configuration */
const initStripe = async () => {
  console.log('Preparing Stripe setup...\n');

  // Get the domain details from the user
  const domain = await getDomain();

  // Setup Stripe
  const stripeConfig = await setupStripe({ domain });

  // Print final notes
  printStripeFinalNotes(stripeConfig);

  // End the script
  process.exit(0);
};

await initStripe();
