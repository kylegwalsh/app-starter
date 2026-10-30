import { Reasoning } from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * The model's (summarized) reasoning. While streaming it shows a live "Thinking… (3.2s)" timer and
 * starts open; once done it locks to "Thought for 3.2s". Reasoning loaded from history, with no
 * streaming to time, just reads "Thought".
 */
const meta = {
  title: 'chat/Reasoning',
  component: Reasoning,
  args: {
    state: 'done',
    children:
      'The user asked for primes below 50. A sieve is quick and exact, so I will run one rather than recall the list.',
  },
  argTypes: {
    state: {
      options: ['streaming', 'done'],
      control: { type: 'radio' },
    },
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

/**
 * Reasoning loaded from history.
 */
export const Done: Story = {};

/**
 * Reasoning still streaming, with the live timer.
 */
export const Streaming: Story = {
  args: {
    state: 'streaming',
  },
};
