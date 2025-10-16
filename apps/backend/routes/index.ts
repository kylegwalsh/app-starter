import { ai } from '@repo/ai';

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

    const result2 = await ai.generateText({
      name: 'Generate 1 to 1000',
      prompt: 'Generate a random number between 1 and 1000',
    });
    return { result, result2 };
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
