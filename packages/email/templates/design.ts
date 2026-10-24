// Builds PostHog email designs (Unlayer design JSON) from native blocks, so every template stays
// editable block by block in PostHog's visual editor. The server renders the sent HTML from the design.

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { readThemeColor } from '@repo/design/lib/theme';

/** The design system's stylesheet, where the app's theme colors live */
const designCss = fs.readFileSync(
  fileURLToPath(import.meta.resolve('@repo/design/globals.css')),
  'utf8',
);

/** The email palette */
export const palette = {
  primary: readThemeColor({ css: designCss, variable: '--primary' }),
  primaryForeground: readThemeColor({ css: designCss, variable: '--primary-foreground' }),
  body: '#404040',
  muted: '#737373',
  hairline: '#e5e5e5',
  panel: '#f5f5f5',
  white: '#ffffff',
} as const;

/** Liquid for the app name, which every send passes as `appName` */
export const appName = "{{ variables.appName | default: 'App' }}";

/** The side padding shared by every block */
const SIDE = '24px';

/** Shows a block only when a Liquid condition holds (the whole block, padding included) */
type DisplayCondition = { label: string; description: string; before: string; after: string };

type Block = {
  type: 'text' | 'heading' | 'button' | 'divider' | 'html';
  values: Record<string, unknown>;
};

type Row = {
  blocks: Block[];
};

/** The native blocks a template is composed from */
export const blocks = {
  /** The app name at the top of the email */
  wordmark: (suffix?: string): Block => ({
    type: 'text',
    values: {
      text: `<p><strong>${appName}</strong>${suffix ? `<span style="color: ${palette.muted}">&nbsp;·&nbsp;${suffix}</span>` : ''}</p>`,
      fontSize: '16px',
      lineHeight: '140%',
      color: palette.primary,
      textAlign: 'left',
      containerPadding: `40px ${SIDE} 32px`,
    },
  }),
  /** The headline */
  heading: (text: string): Block => ({
    type: 'heading',
    values: {
      headingType: 'h1',
      text,
      fontSize: '30px',
      fontWeight: 700,
      lineHeight: '115%',
      color: palette.primary,
      textAlign: 'left',
      containerPadding: `0px ${SIDE} 16px`,
    },
  }),
  /** A paragraph of body text (one block per paragraph) */
  paragraph: (
    html: string,
    {
      tone = 'body',
      padding = `0px ${SIDE} 24px`,
      displayCondition,
    }: {
      tone?: 'body' | 'muted';
      padding?: string;
      displayCondition?: DisplayCondition;
    } = {},
  ): Block => ({
    type: 'text',
    values: {
      text: html,
      fontSize: { body: '16px', muted: '14px' }[tone],
      lineHeight: '160%',
      color: { body: palette.body, muted: palette.muted }[tone],
      textAlign: 'left',
      containerPadding: padding,
      ...(displayCondition && { displayCondition: { type: 'liquid', ...displayCondition } }),
    },
  }),
  /** A button for CTAs */
  button: (text: string, href: string): Block => ({
    type: 'button',
    values: {
      text,
      href: { name: 'web', values: { href, target: '_blank' } },
      buttonColors: {
        color: palette.primaryForeground,
        backgroundColor: palette.primary,
        hoverColor: palette.white,
        hoverBackgroundColor: '#000000',
      },
      fontSize: '16px',
      fontWeight: 600,
      padding: '14px 28px',
      borderRadius: '8px',
      textAlign: 'left',
      containerPadding: `8px ${SIDE} 32px`,
    },
  }),
  /** A hairline between sections */
  divider: ({
    padding = `8px ${SIDE}`,
    displayCondition,
  }: { padding?: string; displayCondition?: DisplayCondition } = {}): Block => ({
    type: 'divider',
    values: {
      width: '100%',
      border: { borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: palette.hairline },
      textAlign: 'center',
      containerPadding: padding,
      ...(displayCondition && { displayCondition: { type: 'liquid', ...displayCondition } }),
    },
  }),
  /** Raw HTML, only for what the native blocks can't express */
  html: (html: string, padding = `0px ${SIDE} 32px`): Block => ({
    type: 'html',
    values: { html, containerPadding: padding },
  }),
};

/**
 * The accent bar at the top of every email. Only the divider's border is colored: a row
 * background fills the full email width, and clients that pad the divider's cell show it
 * as a thick bar.
 */
const topBar: Row = {
  blocks: [
    {
      type: 'divider',
      values: {
        width: '100%',
        border: { borderTopWidth: '4px', borderTopStyle: 'solid', borderTopColor: palette.primary },
        textAlign: 'center',
        containerPadding: '0px',
      },
    },
  ],
};

/** Builds a complete design: the accent bar, then the content blocks */
export const createDesign = ({
  preheader,
  content,
}: {
  /** The preview line most inboxes show after the subject */
  preheader: string;
  /** The email's blocks (the last one should carry the bottom spacing) */
  content: Block[];
}) => {
  const rows = [topBar, { blocks: content }];

  // Number every element per type, the way the editor does (u_row_1, u_content_text_2, ...)
  const counters: Record<string, number> = {};
  const nextId = (type: string) => {
    counters[type] = (counters[type] ?? 0) + 1;
    return {
      id: `${type.replace('u_content_', '')}-${counters[type]}`,
      htmlID: `${type}_${counters[type]}`,
    };
  };

  return {
    counters,
    schemaVersion: 16,
    body: {
      id: 'body',
      headers: [],
      footers: [],
      values: {
        backgroundColor: palette.white,
        contentWidth: '560px',
        textColor: palette.body,
        fontFamily: {
          label: 'System',
          value: "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif",
        },
        linkStyle: {
          inherit: false,
          linkColor: palette.primary,
          linkHoverColor: palette.primary,
          linkUnderline: true,
          linkHoverUnderline: true,
        },
        preheaderText: preheader,
      },
      rows: rows.map((row) => {
        const rowId = nextId('u_row');
        const columnId = nextId('u_column');
        return {
          id: rowId.id,
          cells: [1],
          values: {
            padding: '0px',
            backgroundColor: '',
            _meta: { htmlID: rowId.htmlID, htmlClassNames: 'u_row' },
          },
          columns: [
            {
              id: columnId.id,
              values: { _meta: { htmlID: columnId.htmlID, htmlClassNames: 'u_column' } },
              contents: row.blocks.map((block) => {
                const blockId = nextId(`u_content_${block.type}`);
                return {
                  id: blockId.id,
                  type: block.type,
                  values: {
                    ...block.values,
                    _meta: { htmlID: blockId.htmlID, htmlClassNames: `u_content_${block.type}` },
                  },
                };
              }),
            },
          ],
        };
      }),
    },
  };
};

/** A transactional email template, as uploaded to PostHog */
export type EmailTemplateDefinition = {
  /** The template's name in PostHog's library (also how setup finds it again) */
  name: string;
  /** What the template is for */
  description: string;
  /** Whether the email carries secrets (PostHog then keeps no copy of each sent email) */
  sensitive: boolean;
  /** The email's subject line */
  subject: string;
  /** The plain-text version for clients that don't render HTML */
  text: string;
  /** Who replies go to (supports Liquid), defaults to the sender's reply-to */
  replyTo?: string;
  /** The content blocks that make up the email */
  design: ReturnType<typeof createDesign>;
};
