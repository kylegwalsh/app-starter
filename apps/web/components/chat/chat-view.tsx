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
import { useChatContext } from './chat-provider';
import { hasVisibleContent, isUserOrAssistant } from './chat-utils';

/** Centered welcome screen shown before any message has been sent */
const WelcomeScreen: FC<{ uploadError: string | null }> = ({ uploadError }) => (
  <div className="flex h-full flex-col items-center justify-center px-4">
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-center text-2xl font-medium">What's on your mind today?</h1>
      {uploadError && <div className="text-destructive text-center text-xs">{uploadError}</div>}
      <PromptInputBar />
    </div>
  </div>
);

/** Full chat view — messages list, thinking/error states, and input bar */
export const ChatView = () => {
  const {
    messages,
    status,
    error,
    retry,
    isLoading,
    uploadError,
    submitFeedback,
    cancelledMessageIds,
    erroredMessageIds,
    conversationId,
  } = useChatContext();

  // Drop system/data roles and empty assistant shells left by failed streams.
  // Keep cancelled and errored assistant messages even if their parts are
  // empty — they need to render their respective badges.
  const visibleMessages = messages
    .filter((m) => isUserOrAssistant(m))
    .filter(
      (m) =>
        m.role !== 'assistant' ||
        hasVisibleContent(m.parts) ||
        m.metadata?.cancelled === true ||
        m.metadata?.errored === true ||
        cancelledMessageIds.has(m.id) ||
        erroredMessageIds.has(m.id),
    );

  // Welcome screen only on the bare `/chat` route — an existing conversation
  // with no messages (e.g. a previous send errored before persistence) still
  // gets the full layout so the input stays at the bottom.
  if (!conversationId && visibleMessages.length === 0 && !isLoading && !error) {
    return <WelcomeScreen uploadError={uploadError} />;
  }

  // Keep the indicator visible until the assistant message has something to
  // render. `useChat` flips `status` to `streaming` on the first stream chunk
  // (often a metadata frame), but `smoothStream` may still be buffering up to
  // a word boundary — without this we get a brief gap with nothing on screen.
  const lastMessage = messages.at(-1);
  const assistantHasVisibleContent =
    lastMessage?.role === 'assistant' && hasVisibleContent(lastMessage.parts);
  const showThinking =
    (status === 'submitted' || status === 'streaming') && !assistantHasVisibleContent;

  return (
    <div className="flex h-full flex-col">
      <Conversation>
        <ConversationContent className="gap-4 py-6">
          {visibleMessages.map((message, index) => {
            if (message.role === 'user') {
              return <UserMessage key={message.id} message={message} />;
            }
            const isLatest = index === visibleMessages.length - 1;
            return (
              <AssistantMessage
                cancelled={cancelledMessageIds.has(message.id)}
                errored={erroredMessageIds.has(message.id)}
                isLatest={isLatest}
                isLoading={isLoading}
                key={message.id}
                message={message}
                onFeedback={submitFeedback}
                onRetry={retry}
              />
            );
          })}

          {showThinking && <ThinkingIndicator />}

          {/* Fallback for the case where the stream errored before useChat
              created an assistant stub — the last visible row is a user
              message, so the inline path has nothing to attach to. Render
              the same ChatError standalone here so the error sits right
              after that user message. */}
          {error && !isLoading && visibleMessages.at(-1)?.role !== 'assistant' && (
            <ChatError message="Something went wrong generating this response." onRetry={retry} />
          )}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

      {uploadError && <div className="text-destructive mx-4 mb-2 text-xs">{uploadError}</div>}

      <div className="border-t p-3">
        <PromptInputBar />
      </div>
    </div>
  );
};
