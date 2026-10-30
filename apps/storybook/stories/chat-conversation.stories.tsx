import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  Message,
  MessageContent,
  MessageResponse,
} from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const TURNS = Array.from({ length: 8 }, (_, index) => [
  { id: `user-${index}`, from: 'user' as const, text: `Question ${index + 1}: what's next?` },
  {
    id: `assistant-${index}`,
    from: 'assistant' as const,
    text: `Answer ${index + 1}. Here is a longer paragraph so the conversation overflows its container and can scroll, which is when the scroll-to-bottom button appears.`,
  },
]).flat();

/**
 * The scrolling message list. It sticks to the bottom as new content streams in, and shows a
 * scroll-to-bottom button once the user scrolls up.
 */
const meta = {
  title: 'chat/Conversation',
  component: Conversation,
  // The messages are rendered below
  args: {
    children: null,
  },
  parameters: {
    layout: 'padded',
  },
  render: (args) => (
    <div className="flex h-[420px] flex-col rounded-lg border">
      <Conversation {...args}>
        <ConversationContent>
          {TURNS.map((turn) => (
            <Message from={turn.from} key={turn.id}>
              <MessageContent>
                <MessageResponse>{turn.text}</MessageResponse>
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  ),
} satisfies Meta<typeof Conversation>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Starts at the latest message; scroll up to see the scroll-to-bottom button.
 */
export const Default: Story = {};
