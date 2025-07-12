import { ai } from '@repo/ai';
import { analytics } from '@repo/analytics';

import { db } from '@/db';

import { t } from './trpc/init';
import { publicProcedure } from './trpc/procedures';

const triggerError8 = async () => {
  await analytics.captureException(new Error('Manual trigger 1'));
  throw new Error('Triggering a backend error 8');
};

/** The actual router used to handle all tRPC traffic */
export const router = t.router({
  test: publicProcedure.query(async () => {
    const count = await db.user.count();
    return count;
  }),
  triggerError: publicProcedure.mutation(async () => {
    await triggerError8();
  }),
  ai: publicProcedure.mutation(async () => {
    const { text } = await ai.generateText({
      prompt: 'Generate a random number between 1 and 100',
    });
    const { text: text2 } = await ai.generateText({
      system: 'Only keep the randomly generated number, remove all other text',
      prompt: text,
    });
    return { text, text2 };
  }),
});

/**
 * The type of our backend router
 *
 * Note: This is shared with the frontend by generating the types
 * and configuring our tsconfig intelligently
 */
export type AppRouter = typeof router;
