'use client';

import 'react-medium-image-zoom/dist/styles.css';

import { CHAT_ALLOWED_FILE_TYPES, CHAT_MAX_FILE_SIZE } from '@repo/constants';
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@repo/design/components/ai-elements/attachments';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@repo/design/components/ai-elements/conversation';
import {
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '@repo/design/components/ai-elements/message';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from '@repo/design/components/ai-elements/prompt-input';
import { Shimmer } from '@repo/design/components/ai-elements/shimmer';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@repo/design/components/ai-elements/tool';
import { ChatError } from '@repo/design/components/chat';
import { Button } from '@repo/design/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/design/components/ui/popover';
import { Textarea } from '@repo/design/components/ui/textarea';
import { cn } from '@repo/design/lib/utils';
import { isFileUIPart } from 'ai';
import {
  CheckIcon,
  CopyIcon,
  SendIcon,
  SparklesIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from 'lucide-react';
import { useState } from 'react';
import Zoom from 'react-medium-image-zoom';

import { useChatContext } from './chat-provider';

/** Renders the attachment header only when files are staged — avoids empty addon height */
function AttachmentPreviews() {
  const { files, remove } = usePromptInputAttachments();
  if (files.length === 0) {
    return null;
  }
  return (
    <PromptInputHeader className="px-3 pt-2 pb-1">
      <Attachments variant="inline">
        {files.map((file) => (
          <Attachment data={file} key={file.id} onRemove={() => remove(file.id)}>
            <AttachmentPreview />
            <AttachmentInfo />
            <AttachmentRemove />
          </Attachment>
        ))}
      </Attachments>
    </PromptInputHeader>
  );
}

/** Copy button with brief check-mark confirmation */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <MessageAction label="Copy" onClick={handleCopy} tooltip="Copy">
      {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
    </MessageAction>
  );
}

type FeedbackProps = {
  messageId: string;
  existingFeedback: boolean | null;
  onFeedback: (messageId: string, rating: 'up' | 'down', comment?: string) => void;
};

/** Thumbs-up / thumbs-down with a comment popover on negative feedback */
function FeedbackButtons({ messageId, existingFeedback, onFeedback }: FeedbackProps) {
  const [localFeedback, setLocalFeedback] = useState<boolean | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [comment, setComment] = useState('');
  const feedback = localFeedback ?? existingFeedback ?? null;

  const handleThumbsUp = () => {
    setLocalFeedback(true);
    onFeedback(messageId, 'up');
  };

  const handleSubmitNegative = () => {
    setLocalFeedback(false);
    onFeedback(messageId, 'down', comment.trim() || undefined);
    setPopoverOpen(false);
    setComment('');
  };

  return (
    <>
      <MessageAction
        className={feedback === true ? 'text-primary' : undefined}
        disabled={feedback !== null}
        label="Helpful"
        onClick={handleThumbsUp}
        tooltip="Helpful"
      >
        <ThumbsUpIcon className="size-3" />
      </MessageAction>

      <Popover onOpenChange={setPopoverOpen} open={popoverOpen}>
        <PopoverTrigger asChild>
          <MessageAction
            className={feedback === false ? 'text-destructive' : undefined}
            disabled={feedback !== null}
            label="Not helpful"
            onClick={() => setPopoverOpen(true)}
            tooltip="Not helpful"
          >
            <ThumbsDownIcon className="size-3" />
          </MessageAction>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3" side="top">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium">How could this response be improved?</p>
            <Textarea
              className="min-h-16 resize-none text-xs"
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional feedback..."
              rows={2}
              value={comment}
            />
            <div className="flex justify-end">
              <Button onClick={handleSubmitNegative} size="sm">
                <SendIcon className="size-3" />
                Submit
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

/** Renders the full chat view — messages list + input bar */
function ChatView() {
  const {
    messages,
    status,
    error,
    stop,
    regenerate,
    isLoading,
    isUploading,
    uploadError,
    handleSubmit,
    submitFeedback,
  } = useChatContext();

  // Show upload spinner while files are being sent to S3
  const effectiveStatus = isUploading ? ('submitted' as const) : status;

  return (
    <div className="flex h-full flex-col">
      <Conversation>
        <ConversationContent className="gap-4 py-6">
          {messages.length === 0 && !isLoading && !error && (
            <ConversationEmptyState description="Send a message to start a conversation" />
          )}

          {messages
            .filter(
              (m): m is typeof m & { role: 'user' | 'assistant' } =>
                m.role === 'user' || m.role === 'assistant',
            )
            // Skip empty assistant messages left over from a failed/errored stream
            .filter((m) => {
              if (m.role !== 'assistant' || isLoading) {
                return true;
              }
              return m.parts.some(
                (p) =>
                  (p.type === 'text' && (p as { text?: string }).text?.trim()) ||
                  p.type === 'dynamic-tool',
              );
            })
            .map((message, index, filtered) => {
              const isLatest = message.role === 'assistant' && index === filtered.length - 1;
              const fileParts = message.parts.filter(isFileUIPart);
              const contentParts = message.parts.filter((p) => !isFileUIPart(p));
              const isUser = message.role === 'user';
              const isAssistant = message.role === 'assistant';

              return (
                <div className="group/message w-full" key={message.id}>
                  {/* File/image tiles above the message */}
                  {fileParts.length > 0 && (
                    <div
                      className={cn(
                        'mb-2 flex flex-wrap gap-2',
                        isUser ? 'justify-end' : 'justify-start',
                      )}
                    >
                      {fileParts.map((part) => {
                        const isImage = part.mediaType.startsWith('image/');
                        if (isImage && part.url) {
                          return (
                            <Zoom key={part.url}>
                              {/* oxlint-disable-next-line eslint-plugin-next(no-img-element): CDN-hosted attachment, not optimizable */}
                              <img
                                alt={part.filename ?? 'image'}
                                className="size-24 rounded-lg object-cover"
                                src={part.url}
                              />
                            </Zoom>
                          );
                        }
                        return (
                          <Attachment
                            data={{ ...part, id: part.url ?? part.filename ?? 'file' }}
                            key={part.url ?? part.filename}
                          >
                            <AttachmentPreview />
                          </Attachment>
                        );
                      })}
                    </div>
                  )}

                  <div
                    className={cn(
                      isUser ? 'flex flex-col items-end gap-2' : 'flex items-start gap-3',
                    )}
                  >
                    {/* Bot icon for assistant messages */}
                    {isAssistant && (
                      <div className="bg-muted text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg">
                        <SparklesIcon className="size-3.5" />
                      </div>
                    )}

                    {/* User: render content directly so max-w % resolves against the flex container width.
                        Assistant: wrap in a flex column so content + actions stack vertically. */}
                    {isAssistant ? (
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        {contentParts.map((part) => {
                          if (part.type === 'text') {
                            return (
                              <MessageContent
                                className="text-[13px] leading-relaxed"
                                key={`${message.id}-text`}
                              >
                                <MessageResponse isAnimating={isLoading && isLatest}>
                                  {part.text}
                                </MessageResponse>
                              </MessageContent>
                            );
                          }
                          if (part.type === 'dynamic-tool') {
                            return (
                              <Tool key={part.toolCallId}>
                                <ToolHeader
                                  state={part.state}
                                  toolName={part.toolName}
                                  type="dynamic-tool"
                                />
                                <ToolContent>
                                  {part.input != null && <ToolInput input={part.input} />}
                                  <ToolOutput
                                    errorText={part.errorText ?? undefined}
                                    output={part.output ?? undefined}
                                  />
                                </ToolContent>
                              </Tool>
                            );
                          }
                          return null;
                        })}
                        {!isLoading && (
                          <MessageActions>
                            <CopyButton
                              text={message.parts
                                .filter(
                                  (p): p is { type: 'text'; text: string } => p.type === 'text',
                                )
                                .map((p) => p.text)
                                .join('\n')}
                            />
                            <FeedbackButtons
                              existingFeedback={message.metadata?.feedback ?? null}
                              messageId={message.id}
                              onFeedback={submitFeedback}
                            />
                          </MessageActions>
                        )}
                      </div>
                    ) : (
                      // User messages: direct child of items-end flex so max-w % works correctly
                      contentParts.map((part) => {
                        if (part.type === 'text') {
                          return (
                            <MessageContent
                              className="bg-secondary w-fit max-w-[min(80%,56ch)] overflow-hidden rounded-2xl rounded-br-lg px-3.5 py-2 text-[13px] leading-relaxed break-words"
                              key={`${message.id}-text`}
                            >
                              <MessageResponse>{part.text}</MessageResponse>
                            </MessageContent>
                          );
                        }
                        return null;
                      })
                    )}
                  </div>
                </div>
              );
            })}

          {/* Thinking indicator while waiting for first token */}
          {status === 'submitted' && messages.at(-1)?.role !== 'assistant' && (
            <div className="flex items-start gap-3">
              <div className="bg-muted text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg">
                <SparklesIcon className="size-3.5" />
              </div>
              <div className="flex h-[calc(13px*1.65)] items-center text-[13px]">
                <Shimmer duration={1}>Thinking...</Shimmer>
              </div>
            </div>
          )}

          {/* Inline error */}
          {error && !isLoading && (
            <ChatError
              message={error.message || 'There was an error generating a response.'}
              onRetry={regenerate}
            />
          )}
        </ConversationContent>

        <ConversationScrollButton />
      </Conversation>

      {/* Upload error */}
      {uploadError && <div className="text-destructive mx-4 mb-2 text-xs">{uploadError}</div>}

      {/* Input bar */}
      <div className="border-t p-3">
        <PromptInput
          accept={CHAT_ALLOWED_FILE_TYPES.join(',')}
          maxFileSize={CHAT_MAX_FILE_SIZE}
          multiple
          onSubmit={handleSubmit}
        >
          <AttachmentPreviews />
          <PromptInputTextarea
            className="min-h-10 pt-2 text-[13px]"
            placeholder="Send a message..."
          />
          <PromptInputFooter className="px-2 pb-2">
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger tooltip="Attach files" />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            </PromptInputTools>
            <PromptInputSubmit onStop={stop} status={effectiveStatus} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

export { ChatView };
