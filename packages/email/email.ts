import { config } from '@repo/config';

import { sendTransactionalEmail } from './posthog';

/** An email we can send (every key in config, whether its template lives in code or only in PostHog) */
type EmailTemplateKey = keyof typeof config.posthog.email.templates;

/** Sends one of our transactional email templates through PostHog, returning the queued send's ID */
const sendTemplate = async ({
  template,
  to,
  distinctId,
  variables,
}: {
  template: EmailTemplateKey;
  /** The recipient's email address */
  to: string;
  /** The recipient's PostHog distinct ID, so the email's events land on their person (defaults to `to`) */
  distinctId?: string;
  /** The template's `{{ variables.* }}` (the app name is always included) */
  variables: Record<string, string>;
}) => {
  const templateId = config.posthog.email.templates[template];
  if (!templateId) {
    throw new Error(`The ${template} email template isn't set up. Run: bun run init:email`);
  }

  const { messageId } = await sendTransactionalEmail({
    templateId,
    to,
    identifiers: distinctId ? { distinct_id: distinctId } : undefined,
    message_data: { appName: config.app.name, ...variables },
  });
  return messageId;
};

/** Methods related to email (each returns the queued send's ID) */
export const email = {
  /** Sends a reset password email */
  sendResetPasswordEmail: async ({ email, resetLink }: { email: string; resetLink: string }) =>
    await sendTemplate({
      template: 'resetPassword',
      to: email,
      variables: { resetLink },
    }),
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
    if (!config.app.supportEmail) {
      throw new Error('Support email not configured');
    }

    return await sendTemplate({
      template: 'contactFormSubmission',
      to: config.app.supportEmail,
      variables: { name, email, company: company ?? '', message },
    });
  },
  /** Sends an invitation to join an organization */
  sendInvitationEmail: async ({
    email,
    organizationName,
    invitationId,
  }: {
    email: string;
    organizationName: string;
    invitationId: string;
  }) =>
    await sendTemplate({
      template: 'inviteToOrganization',
      to: email,
      variables: {
        organizationName,
        inviteLink: `${config.app.url}/auth/accept-invitation?invitationId=${invitationId}`,
      },
    }),
};
