import { log } from '../utils/log.js';

import { getDomain, printEmailFinalNotes, setupPosthogEmail } from './init.js';

/** Set up (or re-check) transactional emails sent through PostHog */
const initEmail = async () => {
  log.step('Preparing email setup...\n');

  // Get the domain details from the user (emails are sent from it)
  const domain = await getDomain();

  // Setup emails, re-checking everything (senders, templates, and a test email)
  const emailSetup = await setupPosthogEmail({ domain, force: true });

  // Print final notes
  log.step('--- Final Notes ---\n');
  printEmailFinalNotes(emailSetup);

  // End the script
  process.exit(0);
};

await initEmail();
