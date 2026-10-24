import { appName, blocks, createDesign, type EmailTemplateDefinition } from './design';

/** Sent when a user is invited to an organization */
export const inviteToOrganizationTemplate: EmailTemplateDefinition = {
  name: 'Organization invitation',
  description:
    'Sent when someone is invited to join an organization. Variables: appName, organizationName, inviteLink.',
  // The email carries an invitation link, so PostHog keeps no copy of each sent email
  sensitive: true,
  subject: `You're invited to join {{ variables.organizationName }} on ${appName}`,
  text: [
    'Join {{ variables.organizationName }}',
    '',
    `You've been invited to join {{ variables.organizationName }} on ${appName}. Use this link to accept the invitation:`,
    '',
    '{{ variables.inviteLink }}',
    '',
    "Weren't expecting this? You can ignore this email. Nothing changes unless you accept.",
  ].join('\n'),
  design: createDesign({
    preheader: `Accept the invitation to start working with your team on ${appName}.`,
    content: [
      blocks.wordmark(),
      blocks.heading('Join {{ variables.organizationName }}'),
      blocks.paragraph(
        `<p>You've been invited to join <strong>{{ variables.organizationName }}</strong> on ${appName}. Accept the invitation to start working with your team.</p>`,
      ),
      blocks.button('Accept invitation', '{{ variables.inviteLink }}'),
      blocks.paragraph(
        '<p>Button not working? Paste this link into your browser:<br /><a href="{{ variables.inviteLink }}" style="word-break: break-all">{{ variables.inviteLink }}</a></p>',
        { tone: 'muted' },
      ),
      blocks.divider(),
      blocks.paragraph(
        "<p>Weren't expecting this? You can ignore this email. Nothing changes unless you accept.</p>",
        { tone: 'muted', padding: '16px 24px 40px' },
      ),
    ],
  }),
};
