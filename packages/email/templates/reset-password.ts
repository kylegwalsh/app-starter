import { appName, blocks, createDesign, type EmailTemplateDefinition } from './design';

/** Sent when a user asks to reset their password */
export const resetPasswordTemplate: EmailTemplateDefinition = {
  name: 'Reset password',
  description: 'Sent when a user asks to reset their password. Variables: appName, resetLink.',
  // The email carries a reset link, so PostHog keeps no copy of each sent email
  sensitive: true,
  subject: `Reset your ${appName} password`,
  text: [
    'Reset your password',
    '',
    `We got a request to reset the password for your ${appName} account. Use this link to choose a new one:`,
    '',
    '{{ variables.resetLink }}',
    '',
    "Didn't ask for this? You can safely ignore this email. Your password won't change unless you use the link above.",
  ].join('\n'),
  design: createDesign({
    preheader: "Use this link to choose a new password. It expires soon, so don't wait too long.",
    content: [
      blocks.wordmark(),
      blocks.heading('Reset your password'),
      blocks.paragraph(
        `<p>We got a request to reset the password for your ${appName} account. Click the button below to choose a new one.</p>`,
      ),
      blocks.button('Choose a new password', '{{ variables.resetLink }}'),
      blocks.paragraph(
        '<p>Button not working? Paste this link into your browser:<br /><a href="{{ variables.resetLink }}" style="word-break: break-all">{{ variables.resetLink }}</a></p>',
        { tone: 'muted' },
      ),
      blocks.divider(),
      blocks.paragraph(
        "<p>Didn't ask for this? You can safely ignore this email. Your password won't change unless you use the link above.</p>",
        { tone: 'muted', padding: '16px 24px 40px' },
      ),
    ],
  }),
};
