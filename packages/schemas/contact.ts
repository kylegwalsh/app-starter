import { z } from 'zod';

/** Schemas for the contact form */
export const contactSchema = {
  /** Schema for a contact form submission */
  submit: z.object({
    name: z
      .string({ error: 'Please enter your name' })
      .trim()
      .min(1, 'Please enter your name')
      .max(200),
    email: z.email({ error: 'Please enter a valid email' }).max(320),
    company: z.string().trim().max(200).optional(),
    message: z
      .string({ error: 'Please enter a message' })
      .trim()
      .min(1, 'Please enter a message')
      .max(5000),
  }),
};
