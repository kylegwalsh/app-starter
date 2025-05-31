import { Label } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * Renders an accessible label associated with controls.
 */
const meta = {
  title: 'ui/Label',
  component: Label,
  argTypes: {
    children: {
      control: { type: 'text' },
    },
  },
  args: {
    children: 'Your email address',
    htmlFor: 'email',
  },
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof Label>;

/**
 * The default form of the label.
 */
export const Default: Story = {};
