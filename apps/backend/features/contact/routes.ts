import { contactSchema } from '@repo/schemas';
import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';

import { submitContactForm } from './operations';

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
      await submitContactForm(c.req.valid('json'));
      return c.json({ success: true });
    },
  );
