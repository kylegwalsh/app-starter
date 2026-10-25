import { appName, blocks, createDesign, type EmailTemplateDefinition, palette } from './design';

/** Shows a block only when the visitor filled in their company */
const hasCompany = {
  label: 'Company given',
  description: 'Shown when the visitor filled in the company field',
  before: '{% if variables.company != blank %}',
  after: '{% endif %}',
};

/** A labelled detail row */
const detail = (label: string, value: string) =>
  `<p><span style="font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: ${palette.muted}">${label}</span><br />${value}</p>`;

/** Sent to the support inbox for contact form submissions */
export const contactFormSubmissionTemplate: EmailTemplateDefinition = {
  name: 'Contact form submission',
  description:
    'Sent to the support inbox when someone fills out the marketing site contact form. Variables: appName, name, email, company (optional), message.',
  sensitive: false,
  // The app name prefix makes these easy to spot and filter in a shared inbox
  subject: `[${appName}] New message from {{ variables.name | default: 'a visitor' }}`,
  // Replying goes straight to the person who filled out the form
  replyTo: '{{ variables.email }}',
  text: [
    "New message from {{ variables.name | default: 'a visitor' }}",
    '',
    'Name: {{ variables.name }}',
    'Email: {{ variables.email }}',
    '{% if variables.company != blank %}Company: {{ variables.company }}{% endif %}',
    '',
    '{{ variables.message }}',
  ].join('\n'),
  design: createDesign({
    preheader: `{{ variables.name | default: 'Someone' }} sent a message from the ${appName} website.`,
    content: [
      blocks.wordmark('Contact form'),
      blocks.heading("New message from {{ variables.name | default: 'a visitor' }}"),
      blocks.paragraph('<p>Someone filled out the contact form on the marketing site.</p>'),
      blocks.divider({ padding: '0px 24px' }),
      blocks.paragraph(detail('Name', '{{ variables.name }}'), { padding: '12px 24px' }),
      blocks.divider({ padding: '0px 24px' }),
      blocks.paragraph(
        detail(
          'Email',
          '<a href="mailto:{{ variables.email }}" style="text-decoration: none">{{ variables.email }}</a>',
        ),
        { padding: '12px 24px' },
      ),
      blocks.divider({ padding: '0px 24px' }),
      blocks.paragraph(detail('Company', '{{ variables.company }}'), {
        padding: '12px 24px',
        displayCondition: hasCompany,
      }),
      blocks.divider({ padding: '0px 24px', displayCondition: hasCompany }),
      // The message keeps the visitor's line breaks (Liquid escapes it, so typed HTML shows as text)
      blocks.html(
        `<div style="background: ${palette.panel}; border-left: 4px solid ${palette.primary}; border-radius: 0 8px 8px 0; padding: 20px 24px; font-size: 16px; line-height: 1.6; color: ${palette.primary}; white-space: pre-wrap">{{- variables.message -}}</div>`,
        '24px 24px 40px',
      ),
    ],
  }),
};
