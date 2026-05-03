'use client';

import { CHAT_ALLOWED_FILE_TYPES, CHAT_FILE_TYPES, CHAT_MAX_FILE_SIZE } from '@repo/constants';
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
  getFileTileStyle,
} from '@repo/design/components/ai-elements/attachments';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@repo/design/components/ai-elements/conversation';
import { ImageLightbox } from '@repo/design/components/ai-elements/image-lightbox';
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
import { isFileUIPart, type FileUIPart } from 'ai';
import { CheckIcon, CopyIcon, SendIcon, ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react';
import { useState } from 'react';

import { useChatContext } from './chat-provider';

// ============================================================================
// Types & helpers
// ============================================================================

type ChatMessage = ReturnType<typeof useChatContext>['messages'][number];
type ChatMessagePart = ChatMessage['parts'][number];
type TextPart = { type: 'text'; text: string };

type FeedbackHandler = (messageId: string, rating: 'up' | 'down', comment?: string) => void;

/** Index into CHAT_FILE_TYPES by runtime string without casting at every call site */
const FILE_EXTENSIONS: Record<string, string> = CHAT_FILE_TYPES;

const isTextPart = (p: ChatMessagePart): p is TextPart => p.type === 'text';

const isUserOrAssistant = (m: ChatMessage): m is ChatMessage & { role: 'user' | 'assistant' } =>
  m.role === 'user' || m.role === 'assistant';

/** Derives the extension-style type label from the mime map, falling back to the filename */
const getFileMeta = (mediaType: string, filename: string | undefined) => {
  const mappedExt = FILE_EXTENSIONS[mediaType];
  const filenameExt = filename?.split('.').pop();
  const typeLabel = (mappedExt ?? filenameExt ?? 'file').toUpperCase();
  return { ...getFileTileStyle(mediaType), typeLabel };
};

/** Joins all text parts of a message into a single string for copying */
const extractMessageText = (parts: readonly ChatMessagePart[]): string =>
  parts
    .filter((p) => isTextPart(p))
    .map((p) => p.text)
    .join('\n');

/** True if an assistant message has any visible output — hides empty shells from failed streams */
const hasVisibleContent = (parts: readonly ChatMessagePart[]): boolean =>
  parts.some((p) => (isTextPart(p) && p.text.trim().length > 0) || p.type === 'dynamic-tool');

// ============================================================================
// Shared visuals
// ============================================================================

// ============================================================================
// Attachments
// ============================================================================

/** Attachment strip above the input — renders only when files are staged */
function AttachmentPreviews() {
  const { files, remove } = usePromptInputAttachments();
  const { attachmentUploads } = useChatContext();
  if (files.length === 0) {
    return null;
  }
  return (
    <PromptInputHeader className="px-3 pt-2 pb-1">
      <Attachments variant="inline">
        {files.map((file) => {
          const upload = attachmentUploads.get(file.url);
          return (
            <Attachment
              data={file}
              error={upload?.status === 'error' ? upload.error : null}
              key={file.id}
              loading={upload?.status === 'uploading'}
              onRemove={() => remove(file.id)}
            >
              <AttachmentPreview />
              <AttachmentInfo />
              <AttachmentRemove />
            </Attachment>
          );
        })}
      </Attachments>
    </PromptInputHeader>
  );
}

/** In-message image with skeleton placeholder and click-to-expand lightbox */
function ChatImage({ url, alt }: { url: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <ImageLightbox alt={alt} src={url}>
      <button
        className="focus-visible:ring-ring block cursor-zoom-in overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:outline-none"
        type="button"
      >
        {!loaded && <span className="bg-muted block size-40 animate-pulse rounded-lg" />}
        {/* oxlint-disable-next-line eslint-plugin-next(no-img-element): CDN-hosted attachment, not optimizable */}
        <img
          alt={alt}
          className={cn(
            'block max-h-80 max-w-xs rounded-lg object-contain',
            loaded ? 'opacity-100' : 'hidden',
          )}
          onLoad={() => setLoaded(true)}
          src={url}
        />
      </button>
    </ImageLightbox>
  );
}

type ChatFileProps = {
  url: string | undefined;
  filename: string | undefined;
  mediaType: string;
};

/** Non-image attachment card — colored icon tile, filename, and type label */
function ChatFile({ url, filename, mediaType }: ChatFileProps) {
  const { Icon, iconBg, typeLabel } = getFileMeta(mediaType, filename);
  const label = filename ?? 'file';

  const body = (
    <>
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg text-white',
          iconBg,
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] leading-tight font-medium">{label}</div>
        <div className="text-muted-foreground truncate text-xs leading-tight">{typeLabel}</div>
      </div>
    </>
  );

  const cardClass =
    'bg-background flex max-w-[min(280px,100%)] items-center gap-2 rounded-xl border p-1.5 pr-3';

  if (url) {
    return (
      <a
        className={cn(cardClass, 'hover:bg-accent transition-colors')}
        href={url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {body}
      </a>
    );
  }
  return <div className={cardClass}>{body}</div>;
}

/**
 * Image and file tiles shown above a message's text content.
 * Images render on top at their natural proportions; file cards render below
 * so the compact cards don't stretch to match image height in a shared row.
 */
function MessageAttachments({
  parts,
  align,
}: {
  parts: FileUIPart[];
  align: 'user' | 'assistant';
}) {
  const { localPreviews } = useChatContext();
  if (parts.length === 0) {
    return null;
  }
  const imageParts = parts.filter((p) => p.mediaType.startsWith('image/'));
  const fileParts = parts.filter((p) => !p.mediaType.startsWith('image/'));

  // Prefer the in-memory blob URL for files we just uploaded — renders
  // instantly instead of waiting on a round-trip fetch of the same bytes.
  const displayUrlFor = (part: FileUIPart) => (part.url && localPreviews.get(part.url)) ?? part.url;

  return (
    <div className={cn('mb-2 flex flex-col gap-2', align === 'user' ? 'items-end' : 'items-start')}>
      {imageParts.length > 0 && (
        <div
          className={cn('flex flex-wrap gap-2', align === 'user' ? 'justify-end' : 'justify-start')}
        >
          {imageParts.map((part) => {
            const key = part.url ?? part.filename ?? 'image';
            const url = displayUrlFor(part);
            if (!url) {
              return null;
            }
            return <ChatImage alt={part.filename ?? 'image'} key={key} url={url} />;
          })}
        </div>
      )}
      {fileParts.length > 0 && (
        <div
          className={cn('flex flex-wrap gap-2', align === 'user' ? 'justify-end' : 'justify-start')}
        >
          {fileParts.map((part) => {
            const key = part.url ?? part.filename ?? 'file';
            return (
              <ChatFile
                filename={part.filename}
                key={key}
                mediaType={part.mediaType}
                url={displayUrlFor(part)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Message action buttons
// ============================================================================

/** Copies text to the clipboard with brief check-mark feedback */
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

type FeedbackButtonsProps = {
  messageId: string;
  existingFeedback: boolean | null;
  onFeedback: FeedbackHandler;
};

/** Thumbs-up / thumbs-down with a comment popover on thumbs-down */
function FeedbackButtons({ messageId, existingFeedback, onFeedback }: FeedbackButtonsProps) {
  const [localFeedback, setLocalFeedback] = useState<boolean | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [comment, setComment] = useState('');
  const feedback = localFeedback ?? existingFeedback;
  const submitted = feedback !== null;

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
        disabled={submitted}
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
            disabled={submitted}
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

// ============================================================================
// Message rendering
// ============================================================================

/** User message bubble — right-aligned with rounded secondary background */
function UserMessage({ message }: { message: ChatMessage }) {
  const fileParts = message.parts.filter((p) => isFileUIPart(p));
  const textParts = message.parts.filter((p) => isTextPart(p));

  return (
    <div className="group/message w-full">
      <MessageAttachments align="user" parts={fileParts} />
      <div className="flex flex-col items-end gap-2">
        {textParts.map((part, partIndex) => (
          <MessageContent
            className="bg-secondary w-fit max-w-[min(80%,56ch)] overflow-hidden rounded-2xl rounded-br-lg px-3.5 py-2 text-[13px] leading-relaxed break-words"
            // oxlint-disable-next-line eslint-plugin-react(no-array-index-key): text parts have no stable ID; index is the canonical position within a message
            key={`${message.id}-text-${partIndex}`}
          >
            <MessageResponse>{part.text}</MessageResponse>
          </MessageContent>
        ))}
      </div>
    </div>
  );
}

type AssistantMessageProps = {
  message: ChatMessage;
  isLatest: boolean;
  isLoading: boolean;
  onFeedback: FeedbackHandler;
};

/** Assistant message — avatar + rendered text/tool parts with copy & feedback actions */
function AssistantMessage({ message, isLatest, isLoading, onFeedback }: AssistantMessageProps) {
  const fileParts = message.parts.filter((p) => isFileUIPart(p));
  const contentParts = message.parts.filter((p) => !isFileUIPart(p));
  const isAnimating = isLoading && isLatest;

  return (
    <div className="group/message w-full">
      <MessageAttachments align="assistant" parts={fileParts} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {contentParts.map((part, partIndex) => {
          if (part.type === 'text') {
            return (
              <MessageContent
                className="text-[13px] leading-relaxed"
                // oxlint-disable-next-line eslint-plugin-react(no-array-index-key): text parts have no stable ID; index is the canonical position within a message
                key={`${message.id}-text-${partIndex}`}
              >
                <MessageResponse isAnimating={isAnimating}>{part.text}</MessageResponse>
              </MessageContent>
            );
          }
          if (part.type === 'dynamic-tool') {
            return (
              <Tool key={part.toolCallId}>
                <ToolHeader state={part.state} toolName={part.toolName} type="dynamic-tool" />
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
            <CopyButton text={extractMessageText(message.parts)} />
            <FeedbackButtons
              existingFeedback={message.metadata?.feedback ?? null}
              messageId={message.id}
              onFeedback={onFeedback}
            />
          </MessageActions>
        )}
      </div>
    </div>
  );
}

/** "Thinking…" placeholder shown while waiting for the first assistant token */
function ThinkingIndicator() {
  return (
    <div className="flex h-[calc(13px*1.65)] items-center text-[13px]">
      <Shimmer duration={1}>Thinking...</Shimmer>
    </div>
  );
}

// ============================================================================
// Input
// ============================================================================

/** Prompt input bar with staged-attachment previews and the attach-file menu */
function PromptInputBar() {
  const { status, isUploading, attachmentUploads, stop, handleSubmit } = useChatContext();
  // Block sending while attachments are still uploading or any are in an error state.
  // Shown as disabled rather than a loading spinner — the tile overlay already signals
  // "uploading", so the submit button doesn't need to duplicate that indicator.
  const hasUploadError = Array.from(attachmentUploads.values()).some((u) => u.status === 'error');
  const disableSend = isUploading || hasUploadError;

  return (
    <PromptInput
      accept={CHAT_ALLOWED_FILE_TYPES.join(',')}
      maxFileSize={CHAT_MAX_FILE_SIZE}
      multiple
      onSubmit={handleSubmit}
    >
      <AttachmentPreviews />
      <PromptInputTextarea className="min-h-10 pt-2 text-[13px]" placeholder="Ask anything..." />
      <PromptInputFooter className="px-2 pb-2">
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger tooltip="Attach files" />
            <PromptInputActionMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
        </PromptInputTools>
        <PromptInputSubmit disabled={disableSend} onStop={stop} status={status} />
      </PromptInputFooter>
    </PromptInput>
  );
}

// ============================================================================
// Main view
// ============================================================================

/** Centered welcome screen shown before any message has been sent */
function WelcomeScreen({ uploadError }: { uploadError: string | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-center text-2xl font-medium">What's on your mind today?</h1>
        {uploadError && <div className="text-destructive text-center text-xs">{uploadError}</div>}
        <PromptInputBar />
      </div>
    </div>
  );
}

/** Full chat view — messages list, thinking/error states, and input bar */
function ChatView() {
  const { messages, status, error, regenerate, isLoading, uploadError, submitFeedback } =
    useChatContext();

  // Drop system/data roles and empty assistant shells left by failed streams
  const visibleMessages = messages
    .filter((m) => isUserOrAssistant(m))
    .filter((m) => m.role !== 'assistant' || isLoading || hasVisibleContent(m.parts));

  if (visibleMessages.length === 0 && !isLoading && !error) {
    return <WelcomeScreen uploadError={uploadError} />;
  }

  const showThinking = status === 'submitted' && messages.at(-1)?.role !== 'assistant';

  return (
    <div className="flex h-full flex-col">
      <Conversation>
        <ConversationContent className="gap-4 py-6">
          {visibleMessages.map((message, index) => {
            if (message.role === 'user') {
              return <UserMessage key={message.id} message={message} />;
            }
            return (
              <AssistantMessage
                isLatest={index === visibleMessages.length - 1}
                isLoading={isLoading}
                key={message.id}
                message={message}
                onFeedback={submitFeedback}
              />
            );
          })}

          {showThinking && <ThinkingIndicator />}

          {error && !isLoading && (
            <ChatError
              message={error.message || 'There was an error generating a response.'}
              onRetry={regenerate}
            />
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
}

export { ChatView };
