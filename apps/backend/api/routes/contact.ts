import { email } from '@repo/email';
import { log } from '@repo/logs';
import { contactSchema } from '@repo/schemas';
import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';

/** The contact router */
export const contactRouter = new Hono()
  /** Forwards a contact form submission to our support inbox */
  .post(
    '/contact',
    describeRoute({
      summary: 'Submit the contact form',
      tags: ['Contact'],
    }),
    validator('json', contactSchema.submit),
    async (c) => {
      const input = c.req.valid('json');

      // Log the lead first so it isn't lost if the notification fails
      log.info({ contact: input }, 'Contact form submitted');

      await email.sendContactEmail(input);
      return c.json({ success: true });
    },
  );
