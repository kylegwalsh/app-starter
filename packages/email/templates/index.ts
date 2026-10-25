import type { config } from '@repo/config';

import { contactFormSubmissionTemplate } from './contact-form-submission';
import type { EmailTemplateDefinition } from './design';
import { inviteToOrganizationTemplate } from './invite-to-organization';
import { resetPasswordTemplate } from './reset-password';

export type { EmailTemplateDefinition } from './design';

/**
 * The transactional email templates we initialize projects with. These are uploaded to
 * Posthog during the `bun run init` setup process. Afterwards, they exist in Posthog and
 * can be edited there.
 */
export const initialEmailTemplates = {
  resetPassword: resetPasswordTemplate,
  contactFormSubmission: contactFormSubmissionTemplate,
  inviteToOrganization: inviteToOrganizationTemplate,
} satisfies Partial<Record<keyof typeof config.posthog.email.templates, EmailTemplateDefinition>>;
