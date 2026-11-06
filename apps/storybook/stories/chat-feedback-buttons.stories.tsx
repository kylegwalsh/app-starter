import { FeedbackButtons } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

/**
 * Thumbs up / down on an assistant message. Thumbs down opens a popover for an optional comment.
 * Once feedback is given, the other button hides and both lock.
 */
const meta = {
  title: 'chat/FeedbackButtons',
  component: FeedbackButtons,
  args: {
    messageId: 'message-1',
    existingFeedback: null,
    onFeedback: fn(),
  },
  parameters: {
    layout: 'centered',
  },
  render: (args) => (
    <div className="flex items-center gap-1">
      <FeedbackButtons {...args} />
    </div>
  ),
} satisfies Meta<typeof FeedbackButtons>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * No feedback yet.
 */
export const Default: Story = {};

/**
 * Thumbs up submits straight away and locks the buttons.
 */
export const ThumbsUp: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Helpful' }));
    await expect(args.onFeedback).toHaveBeenCalledWith('message-1', 'up');
    await expect(canvas.getByRole('button', { name: 'Helpful' })).toBeDisabled();
    await expect(canvas.queryByRole('button', { name: 'Not helpful' })).not.toBeInTheDocument();
  },
};

/**
 * Thumbs down asks how the response could be improved, then submits the comment.
 */
export const ThumbsDownWithComment: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Not helpful' }));
    // The popover renders in a portal outside the story's canvas
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.type(await body.findByPlaceholderText('Optional feedback...'), 'Too long');
    await userEvent.click(body.getByRole('button', { name: 'Submit' }));
    await expect(args.onFeedback).toHaveBeenCalledWith('message-1', 'down', 'Too long');
  },
};

/**
 * Feedback saved earlier shows as the chosen, locked button.
 */
export const AlreadyHelpful: Story = {
  args: {
    existingFeedback: true,
  },
};
