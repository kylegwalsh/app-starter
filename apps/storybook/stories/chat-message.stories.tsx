import {
  CopyButton,
  FeedbackButtons,
  Message,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

const ANSWER = `Here's a **prime sieve** in Python:

\`\`\`python
def primes(n):
    sieve = [True] * (n + 1)
    for p in range(2, int(n ** 0.5) + 1):
        if sieve[p]:
            sieve[p * p :: p] = [False] * len(sieve[p * p :: p])
    return [p for p in range(2, n + 1) if sieve[p]]
\`\`\`

| n | Primes below n |
| --- | --- |
| 10 | 4 |
| 50 | 15 |

It runs in about *O(n log log n)* time.`;

/**
 * A chat message. User messages render as a right-aligned bubble; assistant messages render
 * their Markdown (code blocks are highlighted, with a copy button) via `MessageResponse`.
 */
const meta = {
  title: 'chat/Message',
  component: Message,
  args: {
    from: 'assistant',
  },
  argTypes: {
    from: {
      options: ['user', 'assistant'],
      control: { type: 'radio' },
    },
  },
  parameters: {
    layout: 'padded',
  },
  render: (args) => (
    <Message {...args}>
      <MessageContent>
        <MessageResponse>{ANSWER}</MessageResponse>
      </MessageContent>
    </Message>
  ),
} satisfies Meta<typeof Message>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * An assistant answer with a code block and a table.
 */
export const Assistant: Story = {};

/**
 * A user message, shown as a bubble.
 */
export const User: Story = {
  args: {
    from: 'user',
  },
  render: (args) => (
    <Message {...args}>
      <MessageContent>
        <MessageResponse>Can you write me a prime sieve?</MessageResponse>
      </MessageContent>
    </Message>
  ),
};

/**
 * Use `MessageActions` under a finished answer for copy and feedback.
 */
export const WithActions: Story = {
  render: (args) => (
    <Message {...args}>
      <MessageContent>
        <MessageResponse>The 15 primes below 50 start with 2, 3, 5 and 7.</MessageResponse>
      </MessageContent>
      <MessageActions>
        <CopyButton text="The 15 primes below 50 start with 2, 3, 5 and 7." />
        <FeedbackButtons existingFeedback={null} messageId="message-1" onFeedback={fn()} />
      </MessageActions>
    </Message>
  ),
};

/**
 * Pass `isAnimating` while the answer streams, so incomplete Markdown (like an unclosed code
 * fence) renders cleanly.
 */
export const Streaming: Story = {
  render: (args) => (
    <Message {...args}>
      <MessageContent>
        <MessageResponse isAnimating>{ANSWER.slice(0, 120)}</MessageResponse>
      </MessageContent>
    </Message>
  ),
};
