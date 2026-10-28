'use client';

import { CHAT_FILE_TYPES } from '@repo/constants';
import {
  CopyButton,
  FeedbackButtons,
  MessageActions,
  MessageAttachments,
  MessageContent,
  MessageResponse,
  Reasoning,
  Steps,
  ToolStep,
} from '@repo/design';
import { isFileUIPart } from 'ai';
import { CircleXIcon } from 'lucide-react';

import { api } from '@/lib/api';

import { useChatContext } from './chat-provider';
import {
  extractMessageText,
  formatToolName,
  isProcessPart,
  isProcessPartActive,
  isTextPart,
  type ChatMessage,
  type ChatMessagePart,
} from './chat-utils';

/** Thin wrapper that injects the chat context's localPreviews + the app's file-type map. */
const ChatMessageAttachments: FC<{
  parts: Parameters<typeof MessageAttachments>[0]['parts'];
  align: 'user' | 'assistant';
}> = ({ parts, align }) => {
  const { localPreviews } = useChatContext();
  return (
    <MessageAttachments
      align={align}
      fileTypes={CHAT_FILE_TYPES}
      localPreviews={localPreviews}
      parts={parts}
    />
  );
};

/** User message bubble — right-aligned with rounded secondary background */
export const UserMessage: FC<{ message: ChatMessage }> = ({ message }) => {
  const fileParts = message.parts.filter((p) => isFileUIPart(p));
  const textParts = message.parts.filter((p) => isTextPart(p));

  return (
    <div className="group/message w-full">
      <ChatMessageAttachments align="user" parts={fileParts} />
      <div className="flex flex-col items-end gap-2">
        {textParts.map((part, partIndex) => (
          <MessageContent
            className="bg-secondary w-fit max-w-[min(80%,56ch)] overflow-hidden rounded-2xl rounded-br-lg px-3.5 py-2 text-[13px] leading-relaxed break-words"
            // oxlint-disable-next-line react/no-array-index-key -- text parts have no stable ID; index is the canonical position within a message
            key={`${message.id}-text-${partIndex}`}
          >
            <MessageResponse>{part.text}</MessageResponse>
          </MessageContent>
        ))}
      </div>
    </div>
  );
};

/**
 * Renders a group of consecutive reasoning + tool parts as a "Took N steps"
 * collapsible block. Each step inside is itself collapsible — reasoning stays
 * open while streaming, tool calls open while their input is still streaming
 * or before the output arrives, everything else closes by default.
 */
const ProcessSteps: FC<{ parts: ChatMessagePart[]; isAnimating: boolean }> = ({
  parts,
  isAnimating,
}) => {
  if (parts.length === 0) {
    return null;
  }
  // A stopped reply can leave tools mid-call, so only a streaming message has active steps
  const anyActive = isAnimating && parts.some((p) => isProcessPartActive(p));
  return (
    <Steps count={parts.length} defaultOpen={anyActive}>
      {parts.map((part, index) => {
        if (part.type === 'reasoning') {
          const state = (part as { state?: 'streaming' | 'done' }).state ?? 'done';
          return (
            // oxlint-disable-next-line react/no-array-index-key -- reasoning parts have no stable id
            <Reasoning key={`reasoning-${index}`} state={state}>
              {(part as { text?: string }).text ?? ''}
            </Reasoning>
          );
        }
        if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
          // Both static (`tool-${name}`) and dynamic-tool parts share the same
          // shape modulo a `toolName` field on dynamic-tool.
          const toolPart = part as {
            type: string;
            toolCallId: string;
            toolName?: string;
            state: string;
            output?: unknown;
            errorText?: string;
          };
          const rawToolName =
            part.type === 'dynamic-tool'
              ? (toolPart.toolName ?? 'tool')
              : part.type.slice('tool-'.length);
          return (
            <ToolStep
              defaultOpen={isAnimating && isProcessPartActive(part)}
              failed={toolPart.state === 'output-error' || toolPart.errorText != null}
              key={toolPart.toolCallId}
              name={formatToolName(rawToolName)}
              output={toolPart.output ?? undefined}
            />
          );
        }
        return null;
      })}
    </Steps>
  );
};

/** Saves thumbs up/down feedback (best-effort — feedback is non-critical) */
const submitFeedback = (messageId: string, rating: 'up' | 'down', comment?: string) => {
  api.chat.feedback.$post.call({ json: { messageId, rating, comment } }).catch(() => {});
};

export type AssistantMessageProps = {
  message: ChatMessage;
  /** True while this message is streaming */
  isAnimating: boolean;
  /** Show copy/feedback (hidden while streaming or when the turn errored) */
  showActions: boolean;
};

/** Assistant message — text/tool parts with copy & feedback actions */
export const AssistantMessage: FC<AssistantMessageProps> = ({
  message,
  isAnimating,
  showActions,
}) => {
  const fileParts = message.parts.filter((p) => isFileUIPart(p));
  const contentParts = message.parts.filter((p) => !isFileUIPart(p));
  const isCancelled = message.metadata?.cancelled === true;

  // Walk `contentParts` in order, grouping consecutive reasoning + tool parts
  // into a single "Took N steps" block. Text parts break the group and render
  // inline. This mirrors how ChatGPT / Claude show the model's process before
  // the final answer.
  const rendered: React.ReactNode[] = [];
  let stepBuffer: ChatMessagePart[] = [];
  const flushSteps = (key: string) => {
    if (stepBuffer.length === 0) {
      return;
    }
    rendered.push(<ProcessSteps isAnimating={isAnimating} key={key} parts={stepBuffer} />);
    stepBuffer = [];
  };
  for (const [partIndex, part] of contentParts.entries()) {
    if (isProcessPart(part)) {
      stepBuffer.push(part);
      continue;
    }
    flushSteps(`${message.id}-steps-${partIndex}`);
    if (part.type === 'text') {
      rendered.push(
        <MessageContent
          className="text-[13px] leading-relaxed"
          // oxlint-disable-next-line react/no-array-index-key -- text parts have no stable ID; index is the canonical position within a message
          key={`${message.id}-text-${partIndex}`}
        >
          <MessageResponse isAnimating={isAnimating}>{part.text}</MessageResponse>
        </MessageContent>,
      );
    }
  }
  flushSteps(`${message.id}-steps-end`);

  return (
    <div className="group/message w-full">
      <ChatMessageAttachments align="assistant" parts={fileParts} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {rendered}

        {isCancelled && (
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <CircleXIcon className="size-3.5" />
            <span>Response stopped by user</span>
          </div>
        )}

        {showActions && !isCancelled && (
          <MessageActions>
            <CopyButton text={extractMessageText(message.parts)} />
            <FeedbackButtons
              existingFeedback={message.metadata?.feedback ?? null}
              messageId={message.id}
              onFeedback={submitFeedback}
            />
          </MessageActions>
        )}
      </div>
    </div>
  );
};
