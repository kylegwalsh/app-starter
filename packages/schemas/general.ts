import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { z } from 'zod';

/** Provides generic schema that doesn't fit into other buckets */
export const generalSchema = {
  /** Schema for a string boolean */
  booleanString: z.enum(['true', 'false']),
  /** Schema for a phone number */
  phoneNumber: ({ optional = false }: { optional?: boolean } = {}) =>
    z.string({ required_error: 'Please enter a phone number' }).refine((val) => {
      // If it's optional, just return true
      if (!val && optional) return true;

      // If it's empty, error
      if (val === undefined) return false;

      // If this is our test number and it's allowed, let it through
      if (val.replaceAll(/\D/g, '') === '5555555555') return true;

      // Validate the phone number
      const phoneNumber = parsePhoneNumberFromString(val, 'US');
      if (phoneNumber) return phoneNumber.isValid();

      return false;
    }, 'Please enter a valid phone number'),
  /** Schema for a domain */
  domain: z
    .string()
    .regex(/^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/, {
      message: 'Please enter a valid domain',
    }),
  /** Schema for a URL */
  url: z.string().regex(/^(https?:\/\/)?([a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+.*)$/, {
    message: 'Please enter a valid URL',
  }),
  /** An address object (required fields) */
  address: z.object({
    street: z
      .string({ required_error: 'Please enter your address' })
      .min(1, 'Please enter your address'),
    city: z.string({ required_error: 'Please enter your city' }).min(1, 'Please enter your city'),
    stateCode: z
      .string({ required_error: 'Please select your state' })
      .min(1, 'Please select your state'),
    zipCode: z
      .string({ required_error: 'Please enter your zip code' })
      .min(1, 'Please enter your zip code'),
    street2: z.string().optional(),
  }),
};
