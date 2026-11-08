'use client';

import { ChatFile } from '@repo/design/components/chat/chat-file';
import { ChatImage } from '@repo/design/components/chat/chat-image';
import { cn } from '@repo/design/lib/utils';
import type { FileUIPart } from 'ai';

export type MessageAttachmentsProps = {
  /** The message's file parts */
  parts: FileUIPart[];
  /** Which side of the conversation to align to */
  align: 'user' | 'assistant';
  /** Uploaded URL → local blob URL, for files sent from this browser */
  localPreviews?: ReadonlyMap<string, string>;
};

/** A message's images and files, shown above its text */
export const MessageAttachments = ({ parts, align, localPreviews }: MessageAttachmentsProps) => {
  if (parts.length === 0) {
    return null;
  }
  const imageParts = parts.filter((p) => p.mediaType.startsWith('image/'));
  const fileParts = parts.filter((p) => !p.mediaType.startsWith('image/'));

  // Just-sent files show their local copy instead of downloading the same bytes again
  const displayUrlFor = (part: FileUIPart) =>
    (part.url && localPreviews?.get(part.url)) ?? part.url;

  return (
    <div className={cn('mb-2 flex flex-col gap-2', align === 'user' ? 'items-end' : 'items-start')}>
      {/* Images and files get separate rows, so file cards don't stretch to the images' height */}
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
};
