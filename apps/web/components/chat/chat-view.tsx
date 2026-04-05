'use client';

import {
  ChatError,
  ChatFilePreview,
  ChatInput,
  ChatMessage,
  ChatMessages,
  ChatToolInvocation,
  ChatTypingIndicator,
} from '@repo/design/components/chat';
import { isFileUIPart } from 'ai';
import { FileIcon } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useChatContext } from './chat-provider';

/** Map tool invocation state from AI SDK format to our component format */
const mapToolState = (state: string) => {
  if (state === 'output-available') {
    return 'result' as const;
  }
  if (state === 'output-error') {
    return 'error' as const;
  }
  return 'call' as const;
};

/** Renders the full chat view — messages list + input bar */
function ChatView() {
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    isUploading,
    uploadError,
    error,
    regenerate,
    attachedFiles,
    addFiles,
    removeFile,
    submitFeedback,
  } = useChatContext();

  return (
    <div className="flex h-full flex-col">
      <ChatMessages>
        {messages.length === 0 && !isLoading && !error && (
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
            Send a message to start a conversation
          </div>
        )}

        {messages
          .filter(
            (m): m is typeof m & { role: 'user' | 'assistant' } =>
              m.role === 'user' || m.role === 'assistant',
          )
          .map((message, index, filtered) => {
            const isLatest = message.role === 'assistant' && index === filtered.length - 1;

            return (
              <ChatMessage
                existingFeedback={message.metadata?.feedback ?? null}
                isLatest={isLatest}
                isStreaming={isLoading && isLatest}
                key={message.id}
                onFeedback={
                  message.role === 'assistant'
                    ? (rating, comment) => submitFeedback(message.id, rating, comment)
                    : undefined
                }
                onCopy={() => {
                  const text = message.parts
                    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                    .map((p) => p.text)
                    .join('\n');
                  navigator.clipboard.writeText(text);
                }}
                role={message.role}
              >
                {message.parts.map((part, partIndex) => {
                  if (part.type === 'text') {
                    return (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        key={`${message.id}-text-${String(partIndex)}`}
                      >
                        <Markdown remarkPlugins={[remarkGfm]}>{part.text}</Markdown>
                      </div>
                    );
                  }

                  // Render file/image parts (narrowed via SDK type guard)
                  if (isFileUIPart(part)) {
                    const isImage = part.mediaType.startsWith('image/');

                    if (isImage && part.url) {
                      return (
                        // oxlint-disable-next-line no-img-element: CDN-hosted images, not optimizable by next/image
                        <img
                          alt={part.filename ?? 'Uploaded image'}
                          className="max-h-64 rounded-lg object-contain"
                          key={part.url}
                          src={part.url}
                        />
                      );
                    }

                    if (part.url) {
                      return (
                        <a
                          className="bg-muted/50 hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                          href={part.url}
                          key={part.url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <FileIcon className="text-muted-foreground size-4" />
                          {part.filename ?? 'Download file'}
                        </a>
                      );
                    }
                  }

                  // Handle tool invocations (dynamic tools from MCP adapter)
                  if (part.type === 'dynamic-tool') {
                    return (
                      <ChatToolInvocation
                        error={'errorText' in part ? part.errorText : undefined}
                        key={part.toolCallId}
                        result={
                          'output' in part && part.output != null
                            ? JSON.stringify(part.output)
                            : undefined
                        }
                        state={mapToolState(part.state)}
                        toolName={part.toolName}
                      />
                    );
                  }

                  return null;
                })}
              </ChatMessage>
            );
          })}

        {/* Typing indicator when waiting for first token */}
        {isLoading && messages.length > 0 && messages.at(-1)?.role === 'user' && (
          <ChatTypingIndicator />
        )}

        {/* Inline error — shown where the assistant's response would be */}
        {error && !isLoading && (
          <ChatError
            message={error.message || 'There was an error generating a response.'}
            onRetry={regenerate}
          />
        )}
      </ChatMessages>

      {/* Upload error */}
      {uploadError && <div className="text-destructive mx-4 mb-2 text-xs">{uploadError}</div>}

      {/* Input bar */}
      <div className="bg-background border-t p-4">
        <ChatInput
          filePreview={
            attachedFiles.length > 0
              ? attachedFiles.map((attached, i) => (
                  <ChatFilePreview
                    isUploading={isUploading}
                    key={attached.previewUrl || attached.file.name}
                    name={attached.file.name}
                    onRemove={isUploading ? undefined : () => removeFile(i)}
                    previewUrl={attached.previewUrl}
                    type={attached.file.type}
                  />
                ))
              : undefined
          }
          isLoading={isLoading || isUploading}
          onChange={setInput}
          onFilesSelected={addFiles}
          onSubmit={handleSubmit}
          placeholder="Send a message..."
          value={input}
        />
      </div>
    </div>
  );
}

export { ChatView };
