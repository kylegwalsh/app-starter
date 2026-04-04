'use client';

import { cn } from '@repo/design/lib/utils';
import { PaperclipIcon, SendIcon } from 'lucide-react';
import { type ReactNode, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

type ChatInputProps = {
  /** Current input value */
  value: string;
  /** Called when input value changes */
  onChange: (value: string) => void;
  /** Called when the user submits a message */
  onSubmit: (e: FormEvent) => void;
  /** Called when the user selects files to attach */
  onFilesSelected?: (files: File[]) => void;
  /** Accepted file types (MIME types) */
  acceptedFileTypes?: string;
  /** Preview elements for attached files (rendered above the textarea) */
  filePreview?: ReactNode;
  /** Whether the chat is currently streaming a response */
  isLoading?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Additional class name for the container */
  className?: string;
};

function ChatInput({
  value,
  onChange,
  onSubmit,
  onFilesSelected,
  acceptedFileTypes = 'image/jpeg,image/png,image/gif,image/webp,application/pdf',
  filePreview,
  isLoading = false,
  placeholder = 'Type a message...',
  className,
}: ChatInputProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      onFilesSelected?.(files);
    }
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length > 0) {
      onFilesSelected?.(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (onFilesSelected) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set false if leaving the form entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected?.(files);
    }
  };

  const hasContent = value.trim() || filePreview;

  return (
    <form
      className={cn(
        'flex flex-col gap-2 rounded-lg transition-colors',
        isDragging && 'ring-2 ring-primary/50 bg-primary/5',
        className,
      )}
      data-slot="chat-input"
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onSubmit={(e) => {
        e.preventDefault();
        if (hasContent && !isLoading) {
          onSubmit(e);
        }
      }}
      ref={formRef}
    >
      {/* Drop zone indicator */}
      {isDragging && (
        <div className="border-primary/30 text-muted-foreground flex items-center justify-center rounded-md border-2 border-dashed py-3 text-xs">
          Drop files here
        </div>
      )}

      {/* File previews */}
      {!isDragging && filePreview && <div className="flex flex-wrap gap-2">{filePreview}</div>}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {onFilesSelected && (
          <>
            <Button
              disabled={isLoading}
              onClick={() => fileInputRef.current?.click()}
              size="icon"
              type="button"
              variant="ghost"
            >
              <PaperclipIcon className="size-4" />
            </Button>
            <input
              accept={acceptedFileTypes}
              className="hidden"
              multiple
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
          </>
        )}

        <Textarea
          className="max-h-40 min-h-10 resize-none"
          disabled={isLoading}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          rows={1}
          value={value}
        />
        <Button disabled={!hasContent || isLoading} loading={isLoading} size="icon" type="submit">
          <SendIcon />
        </Button>
      </div>
    </form>
  );
}

export { ChatInput, type ChatInputProps };
