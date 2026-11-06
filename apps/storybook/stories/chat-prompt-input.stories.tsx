import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

/** The full composer: text, attach-file menu, and a submit button for the given status */
const Composer = ({
  status = 'ready',
  ...props
}: ComponentProps<typeof PromptInput> &
  Pick<ComponentProps<typeof PromptInputSubmit>, 'status'>) => (
  <PromptInputProvider>
    <div className="w-[480px]">
      <PromptInput {...props}>
        <PromptInputTextarea placeholder="Ask anything..." />
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger tooltip="Attach files" />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          </PromptInputTools>
          <PromptInputSubmit onStop={fn()} status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  </PromptInputProvider>
);

/**
 * The chat composer. Its text and staged attachments live in `PromptInputProvider`, so they
 * survive the input unmounting; Enter submits and Shift+Enter adds a newline.
 */
const meta = {
  title: 'chat/PromptInput',
  component: PromptInput,
  args: {
    onSubmit: fn(),
    accept: 'image/*,application/pdf',
    multiple: true,
  },
  parameters: {
    layout: 'centered',
  },
  render: (args) => <Composer {...args} />,
} satisfies Meta<typeof PromptInput>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Enter sends the message and clears the input.
 */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const textarea = within(canvasElement).getByPlaceholderText('Ask anything...');
    await userEvent.type(textarea, 'Hello there{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledWith(
      { text: 'Hello there', files: [] },
      expect.anything(),
    );
    await expect(textarea).toHaveValue('');
  },
};

/**
 * While a response streams, the submit button becomes a stop button.
 */
export const Streaming: Story = {
  render: (args) => <Composer {...args} status="streaming" />,
};

/**
 * Between sending and the first streamed chunk, the button shows a spinner and can't be pressed.
 */
export const Submitted: Story = {
  render: (args) => <Composer {...args} status="submitted" />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Submit' })).toBeDisabled();
  },
};

/**
 * After a failed response, the button shows an error icon but still submits.
 */
export const Errored: Story = {
  render: (args) => <Composer {...args} status="error" />,
};
