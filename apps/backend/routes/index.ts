import { ai } from '@repo/ai';
import { z } from 'zod';

import { billingRouter } from './billing';
import { t } from './trpc/init';
import { protectedProcedure } from './trpc/procedures';

/** The actual router used to handle all tRPC traffic */
export const router = t.router({
  ai: protectedProcedure.mutation(async () => {
    const result = await ai.generateText({
      name: 'Generate 1 to 100',
      prompt: 'Generate a random number between 1 and 100',
    });

    const result2 = await ai.generateObject({
      name: 'Generate 1 to 1000',
      prompt: 'Generate a random number between 1 and 1000',
      schema: z.object({
        number: z.number(),
      }),
    });

    return { result1: result.text, result2: result2.object };
  }),
  billing: billingRouter,
});

/**
 * The type of our backend router
 *
 * Note: This is shared with the frontend by generating the types
 * and configuring our tsconfig intelligently
 */
export type AppRouter = typeof router;
