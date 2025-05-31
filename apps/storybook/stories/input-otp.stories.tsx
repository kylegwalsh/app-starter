import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';

/**
 * Accessible one-time password component with copy paste functionality.
 */
const meta = {
  title: 'ui/InputOTP',
  component: InputOTP,
  args: {
    maxLength: 6,
    pattern: REGEXP_ONLY_DIGITS_AND_CHARS,
    children: null,
    'aria-label': 'One-time password',
  },

  render: (args) => (
    <InputOTP {...args} render={undefined}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  ),
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof InputOTP>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the InputOTP field.
 */
export const Default: Story = {};

/**
 * Use multiple groups to separate the input slots.
 */
export const SeparatedGroup: Story = {
  render: (args) => (
    <InputOTP {...args} render={undefined}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  ),
};
