import { MessageAttachments } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const IMAGE_URL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="#2563eb"/><circle cx="120" cy="80" r="48" fill="#f8fafc"/></svg>',
)}`;

const FILE_TYPES = {
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'image/svg+xml': 'svg',
};

/**
 * The files sent with a message: images on top (click to expand), file cards below. Aligns right
 * for user messages and left for assistant messages.
 */
const meta = {
  title: 'chat/MessageAttachments',
  component: MessageAttachments,
  args: {
    align: 'user',
    fileTypes: FILE_TYPES,
    parts: [
      { type: 'file', url: IMAGE_URL, mediaType: 'image/svg+xml', filename: 'diagram.svg' },
      {
        type: 'file',
        url: 'https://example.com/report.pdf',
        mediaType: 'application/pdf',
        filename: 'quarterly-report.pdf',
      },
      {
        type: 'file',
        url: 'https://example.com/revenue.csv',
        mediaType: 'text/csv',
        filename: 'revenue.csv',
      },
    ],
  },
  argTypes: {
    align: {
      options: ['user', 'assistant'],
      control: { type: 'radio' },
    },
  },
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof MessageAttachments>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Files sent by the user.
 */
export const User: Story = {};

/**
 * Files returned by the assistant.
 */
export const Assistant: Story = {
  args: {
    align: 'assistant',
  },
};

/**
 * Only file cards, with no images.
 */
export const FilesOnly: Story = {
  args: {
    parts: [
      {
        type: 'file',
        url: 'https://example.com/report.pdf',
        mediaType: 'application/pdf',
        filename: 'quarterly-report.pdf',
      },
    ],
  },
};
