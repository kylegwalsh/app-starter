import { Shimmer, ThinkingIndicator } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * Text with an animated highlight sweeping across it, for in-progress states.
 */
const meta = {
  title: 'chat/Shimmer',
  component: Shimmer,
  args: {
    children: 'Thinking...',
    duration: 2,
  },
  argTypes: {
    children: {
      control: 'text',
    },
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Shimmer>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default sweep.
 */
export const Default: Story = {};

/**
 * `ThinkingIndicator` is the shimmer shown before a reply's first token arrives.
 */
export const ThinkingIndicatorStory: Story = {
  name: 'Thinking indicator',
  render: () => <ThinkingIndicator />,
};
