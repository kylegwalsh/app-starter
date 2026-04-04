'use client';

import { cn } from '@repo/design/lib/utils';
import { FileIcon, LoaderIcon, XIcon } from 'lucide-react';

import { Button } from '../ui/button';

type ChatFilePreviewProps = {
  /** The file name */
  name: string;
  /** The file MIME type */
  type: string;
  /** Preview URL (object URL for local preview, or CDN URL for persisted files) */
  previewUrl?: string;
  /** Whether the file is currently uploading */
  isUploading?: boolean;
  /** Whether the file can be removed (pre-send only) */
  onRemove?: () => void;
  /** Additional class name */
  className?: string;
};

/** Preview a file attachment — shows thumbnail for images, card with icon for other files */
function ChatFilePreview({
  name,
  type,
  previewUrl,
  isUploading = false,
  onRemove,
  className,
}: ChatFilePreviewProps) {
  const isImage = type.startsWith('image/');

  return (
    <div
      className={cn(
        'group relative inline-flex items-center gap-2 rounded-lg border bg-muted/50',
        isImage ? 'p-1.5' : 'min-w-40 max-w-56 px-3 py-2',
        className,
      )}
      data-slot="chat-file-preview"
    >
      {/* Upload overlay */}
      {isUploading && (
        <div className="bg-background/70 absolute inset-0 z-10 flex items-center justify-center rounded-lg">
          <LoaderIcon className="text-muted-foreground size-4 animate-spin" />
        </div>
      )}

      {isImage && previewUrl ? (
        // oxlint-disable-next-line no-img-element: Design system is framework-agnostic, can't use next/image
        <img alt={name} className="size-10 rounded object-cover" src={previewUrl} />
      ) : (
        <FileIcon className="text-muted-foreground size-4 shrink-0" />
      )}

      <span
        className={cn(
          'truncate text-xs',
          isImage ? 'max-w-24 text-muted-foreground' : 'flex-1 text-foreground',
        )}
      >
        {name}
      </span>

      {onRemove && !isUploading && (
        <Button
          className="absolute -top-1.5 -right-1.5 size-5 rounded-full opacity-0 shadow-sm group-hover:opacity-100"
          onClick={onRemove}
          size="icon"
          variant="outline"
        >
          <XIcon className="size-3" />
        </Button>
      )}
    </div>
  );
}

export { ChatFilePreview, type ChatFilePreviewProps };
