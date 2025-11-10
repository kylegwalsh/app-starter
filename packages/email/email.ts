import { config, env } from '@repo/config';
import { LoopsClient } from 'loops';

/** The Loops client */
const loops = (env as Record<string, string>).LOOPS_API_KEY
  ? new LoopsClient((env as Record<string, string>).LOOPS_API_KEY)
  : undefined;

/** Methods related to email */
export const email = {
  /** Sends a reset password email */
  sendResetPasswordEmail: async ({
    email,
    resetLink,
  }: {
    email: string;
    resetLink: string;
  }) => {
    const transactionalId = config.loops.transactional.resetPassword;
    if (!transactionalId) {
      throw new Error('Reset password template not configured');
    }

    await loops?.sendTransactionalEmail({
      transactionalId,
      email,
      addToAudience: true,
      dataVariables: {
        resetLink,
      },
    });
  },
};
