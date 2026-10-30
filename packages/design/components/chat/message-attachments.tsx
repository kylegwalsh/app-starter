'use client';

import { ChatFile } from '@repo/design/components/chat/chat-file';
import { ChatImage } from '@repo/design/components/chat/chat-image';
import { cn } from '@repo/design/lib/utils';
import type { FileUIPart } from 'ai';

export type MessageAttachmentsProps = {
  parts: FileUIPart[];
  align: 'user' | 'assistant';
  /** Map of `mediaType` → preferred extension label, passed through to `<ChatFile>`. */
  fileTypes: Record<string, string>;
  /**
   * CDN URL → local blob URL. When present, the local URL is preferred over the
   * remote one so just-uploaded files render instantly without a re-fetch.
   */
  localPreviews?: ReadonlyMap<string, string>;
};

/**
 * Image and file tiles shown above a message's text content. Images render on
 * top at their natural proportions; file cards render below so the compact
 * cards don't stretch to match image height in a shared row.
 */
export const MessageAttachments = ({
  parts,
  align,
  fileTypes,
  localPreviews,
}: MessageAttachmentsProps) => {
  if (parts.length === 0) {
    return null;
  }
  const imageParts = parts.filter((p) => p.mediaType.startsWith('image/'));
  const fileParts = parts.filter((p) => !p.mediaType.startsWith('image/'));

  // Prefer the in-memory blob URL when available so just-sent files render
  // instantly instead of waiting on a round-trip fetch of the same bytes.
  const displayUrlFor = (part: FileUIPart) =>
    (part.url && localPreviews?.get(part.url)) ?? part.url;

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
                fileTypes={fileTypes}
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
