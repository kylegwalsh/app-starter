import { email } from '@repo/email';
import { log } from '@repo/logs';
import type { contactSchema } from '@repo/schemas';
import type { z } from 'zod';

/** Forwards a contact form submission to our support inbox */
export const submitContactForm = async (input: z.infer<typeof contactSchema.submit>) => {
  // Log the lead first so it isn't lost if the notification fails
  log.info({ contact: input }, 'Contact form submitted');

  await email.sendContactEmail(input);
};
