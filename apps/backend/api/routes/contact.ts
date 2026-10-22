import { email } from '@repo/email';
import { log } from '@repo/logs';
import { contactSchema } from '@repo/schemas';

import { orpc } from '@/core';

import { publicProcedure } from '../procedures';

/** The contact router */
export const contactRouter = orpc.router({
  /** Forwards a contact form submission to our support inbox */
  submit: publicProcedure
    .route({
      method: 'POST',
      path: '/contact',
      summary: 'Submit the contact form',
      tags: ['Contact'],
    })
    .input(contactSchema.submit)
    .handler(async ({ input }) => {
      // Log the lead first so it isn't lost if the notification fails
      log.info({ contact: input }, 'Contact form submitted');

      await email.sendContactEmail(input);
      return { success: true };
    }),
});
