'use client';

import {
  ChatError,
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ThinkingIndicator,
} from '@repo/design';

import { AssistantMessage, UserMessage } from './chat-messages';
import { PromptInputBar } from './chat-prompt';
import { useActiveChat, useChatContext } from './chat-provider';
import { hasVisibleContent } from './chat-utils';
import { ConversationSkeleton } from './conversation-skeleton';

/** Centered welcome screen shown before any message has been sent */
const WelcomeScreen = () => (
  <div className="flex h-full flex-col items-center justify-center px-4">
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-center text-2xl font-medium">What's on your mind today?</h1>
      <PromptInputBar />
    </div>
  </div>
);

type ChatViewProps = {
  /** Center the input on a welcome screen before the first message (default true) */
  showWelcome?: boolean;
};

/** Full chat view — messages list, thinking/error states, and input bar */
export const ChatView: FC<ChatViewProps> = ({ showWelcome = true }) => {
  const { conversationId, isWaiting, loadingConversationId } = useChatContext();
  const { messages, status, regenerate } = useActiveChat();
  // While a saved conversation loads, show a skeleton for its messages and keep the input disabled
  const isLoadingConversation = loadingConversationId !== undefined;

  if (showWelcome && !isLoadingConversation && !conversationId) {
    return <WelcomeScreen />;
  }

  const isStreaming = status === 'submitted' || status === 'streaming';
  const isBusy = isStreaming || isWaiting;
  const lastMessage = messages.at(-1);
  const lastHasContent = lastMessage?.role === 'assistant' && hasVisibleContent(lastMessage.parts);
  // Keep the indicator up until the reply has something to render (the first chunks are often
  // metadata, and smoothStream buffers to a word boundary)
  const showThinking = isBusy && !lastHasContent;
  // A failed turn, or one that never finished (e.g. the server died), leaves the user's message
  // unanswered; the server keeps no error record, so this is the same live and after a reload
  const showError = !isBusy && (status === 'error' || lastMessage?.role === 'user');

  // Hide empty replies from failed streams, but keep stopped ones for their badge
  const visibleMessages = messages.filter(
    (m) =>
      m.role === 'user' ||
      (m.role === 'assistant' && (hasVisibleContent(m.parts) || m.metadata?.cancelled)),
  );

  return (
    <div className="flex h-full flex-col">
      {isLoadingConversation ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <ConversationSkeleton />
        </div>
      ) : (
        <Conversation>
          <ConversationContent className="gap-4 py-6">
            {visibleMessages.map((message) => {
              if (message.role === 'user') {
                return <UserMessage key={message.id} message={message} />;
              }
              const isLast = message === lastMessage;
              return (
                <AssistantMessage
                  isAnimating={isLast && isStreaming}
                  key={message.id}
                  message={message}
                  showActions={!isLast || (!isBusy && !showError)}
                />
              );
            })}

            {showThinking && <ThinkingIndicator />}

            {showError && (
              <ChatError
                message="Something went wrong generating this response."
                onRetry={() => regenerate()}
              />
            )}
          </ConversationContent>

          <ConversationScrollButton />
        </Conversation>
      )}

      <div className="border-t p-3">
        <PromptInputBar disabled={isLoadingConversation} />
      </div>
    </div>
  );
};
