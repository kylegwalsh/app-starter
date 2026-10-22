import { config, env } from '@repo/config';
import { LoopsClient } from 'loops';

/** The Loops client */
const loops = (env as Record<string, string>).LOOPS_API_KEY
  ? new LoopsClient((env as Record<string, string>).LOOPS_API_KEY)
  : undefined;

/** Methods related to email */
export const email = {
  /** Sends a reset password email */
  sendResetPasswordEmail: async ({ email, resetLink }: { email: string; resetLink: string }) => {
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
  /** Sends a contact form submission email to our support inbox */
  sendContactEmail: async ({
    name,
    email,
    company,
    message,
  }: {
    name: string;
    email: string;
    company?: string;
    message: string;
  }) => {
    const transactionalId = config.loops.transactional.contactFormSubmission;
    if (!transactionalId) {
      throw new Error('Contact form submission template not configured');
    }
    if (!config.app.supportEmail) {
      throw new Error('Support email not configured');
    }
    if (!loops) {
      throw new Error('Loops API key not configured. Please set LOOPS_API_KEY in your secrets.');
    }

    await loops.sendTransactionalEmail({
      transactionalId,
      email: config.app.supportEmail,
      dataVariables: {
        name,
        email,
        company: company ?? '',
        message,
      },
    });
  },
};
