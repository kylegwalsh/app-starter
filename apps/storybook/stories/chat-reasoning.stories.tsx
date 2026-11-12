import { Reasoning } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/** The model's reasoning, shown as "Thinking…" while streaming and "Thought" when done */
const meta = {
  title: 'chat/Reasoning',
  component: Reasoning,
  args: {
    streaming: false,
    children:
      'The user asked for primes below 50. A sieve is quick and exact, so I will run one rather than recall the list.',
  },
  argTypes: {
    children: {
      control: 'text',
    },
  },
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Reasoning>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Reasoning loaded from history */
export const Done: Story = {};

/** Reasoning still streaming */
export const Streaming: Story = {
  args: {
    streaming: true,
  },
};
