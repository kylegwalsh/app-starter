import type { config } from '@repo/config';

import { contactFormSubmissionTemplate } from './contact-form-submission';
import type { EmailTemplateDefinition } from './design';
import { inviteToOrganizationTemplate } from './invite-to-organization';
import { resetPasswordTemplate } from './reset-password';

export type { EmailTemplateDefinition } from './design';

/** Starter transactional email templates, uploaded to PostHog by `bun run init` */
export const initialEmailTemplates = {
  resetPassword: resetPasswordTemplate,
  contactFormSubmission: contactFormSubmissionTemplate,
  inviteToOrganization: inviteToOrganizationTemplate,
} satisfies Partial<Record<keyof typeof config.posthog.email.templates, EmailTemplateDefinition>>;
