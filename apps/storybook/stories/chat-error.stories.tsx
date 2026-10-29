import { ChatError } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

/**
 * Shown in place of an assistant reply when generating it failed, with a way to retry.
 */
const meta = {
  title: 'chat/ChatError',
  component: ChatError,
  args: {
    message: 'Something went wrong generating this response.',
    onRetry: fn(),
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ChatError>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * "Try again" calls `onRetry`.
 */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Try again' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

/**
 * Without `onRetry`, only the message shows.
 */
export const WithoutRetry: Story = {
  args: {
    onRetry: undefined,
  },
};
