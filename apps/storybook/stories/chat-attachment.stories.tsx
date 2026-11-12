import { Attachment, Attachments } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

const IMAGE_URL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#e11d48"/></svg>',
)}`;

/** A staged attachment chip above the chat input, with upload and error states */
const meta = {
  title: 'chat/Attachment',
  component: Attachment,
  args: {
    data: {
      id: 'file-1',
      type: 'file',
      url: 'blob:report',
      mediaType: 'application/pdf',
      filename: 'quarterly-report.pdf',
    },
    loading: false,
    error: null,
    onRemove: fn(),
  },
  parameters: {
    layout: 'centered',
  },
  render: (args) => (
    <Attachments>
      <Attachment {...args} />
    </Attachments>
  ),
} satisfies Meta<typeof Attachment>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A file gets a coloured tile for its type */
export const File: Story = {};

/** An image shows its own thumbnail */
export const Image: Story = {
  args: {
    data: {
      id: 'file-2',
      type: 'file',
      url: IMAGE_URL,
      mediaType: 'image/svg+xml',
      filename: 'red-square.svg',
    },
  },
};

/** A spinner covers the tile while the file uploads */
export const Uploading: Story = {
  args: {
    loading: true,
  },
};

/** A failed upload is outlined, with the error as the chip's tooltip */
export const UploadFailed: Story = {
  args: {
    error: 'Failed to upload quarterly-report.pdf (AccessDenied)',
  },
};

/** The remove button calls `onRemove` */
export const Remove: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Remove' }));
    await expect(args.onRemove).toHaveBeenCalledOnce();
  },
};
