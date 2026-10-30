'use client';

import { getFileTileStyle } from '@repo/design/components/chat/attachments';
import { cn } from '@repo/design/lib/utils';

/** Derives the extension-style type label (e.g. "PDF", "PNG") from media type + filename */
const getTypeLabel = (
  mediaType: string,
  filename: string | undefined,
  fileTypes: Record<string, string>,
): string => {
  const mapped = fileTypes[mediaType];
  const filenameExt = filename?.split('.').pop();
  return (mapped ?? filenameExt ?? 'file').toUpperCase();
};

export type ChatFileProps = {
  url: string | undefined;
  filename: string | undefined;
  mediaType: string;
  /** Map of `mediaType` → preferred extension label (e.g. `{ "image/png": "png" }`) */
  fileTypes: Record<string, string>;
};

/** Non-image attachment card — colored icon tile, filename, and type label */
export const ChatFile = ({ url, filename, mediaType, fileTypes }: ChatFileProps) => {
  const { Icon, iconBg } = getFileTileStyle(mediaType);
  const typeLabel = getTypeLabel(mediaType, filename, fileTypes);
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
};
