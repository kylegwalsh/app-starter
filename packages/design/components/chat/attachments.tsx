'use client';

import { getFileTileStyle } from '@repo/design/components/chat/chat-file';
import { Button } from '@repo/design/components/ui/button';
import { cn } from '@repo/design/lib/utils';
import type { FileUIPart } from 'ai';
import { AlertCircleIcon, Loader2Icon, XIcon } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { useState } from 'react';

/** A staged file */
export type AttachmentData = FileUIPart & { id: string };

export type AttachmentsProps = HTMLAttributes<HTMLDivElement>;

/** A wrapping row of attachment chips */
export const Attachments = ({ className, ...props }: AttachmentsProps) => (
  <div className={cn('flex flex-wrap items-start gap-2', className)} {...props} />
);

/** Translucent overlay that sits over the preview tile (upload spinner / error icon) */
const PreviewOverlay: FC = ({ children }) => (
  <div className="bg-background/70 absolute inset-0 flex items-center justify-center">
    {children}
  </div>
);

type AttachmentPreviewProps = Pick<AttachmentData, 'mediaType' | 'filename' | 'url'> & {
  loading?: boolean;
  error?: string | null;
};

/** The attachment's thumbnail (images) or coloured file-type tile, with upload state */
const AttachmentPreview = ({
  mediaType,
  filename,
  url,
  loading,
  error,
}: AttachmentPreviewProps) => {
  const [loaded, setLoaded] = useState(false);
  const isImage = mediaType.startsWith('image/');
  const tile = isImage ? undefined : getFileTileStyle(filename);

  return (
    <div
      className={cn(
        'relative flex size-5 shrink-0 items-center justify-center overflow-hidden rounded',
        tile ? tile.iconBg : 'bg-background',
      )}
    >
      {tile && <tile.Icon className="size-3 text-white" />}
      {isImage && !loaded && <div className="bg-muted absolute inset-0 animate-pulse" />}
      {isImage && (
        // oxlint-disable-next-line next/no-img-element -- previews are local blob URLs
        <img
          alt={filename ?? 'Image'}
          className={cn(
            'size-full rounded object-cover transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          height={20}
          onLoad={() => setLoaded(true)}
          src={url}
          width={20}
        />
      )}
      {loading && (
        <PreviewOverlay>
          <Loader2Icon className="size-3 animate-spin" />
        </PreviewOverlay>
      )}
      {!loading && error && (
        <PreviewOverlay>
          <AlertCircleIcon className="text-destructive size-3" />
        </PreviewOverlay>
      )}
    </div>
  );
};

export type AttachmentProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  /** The staged file */
  data: AttachmentData;
  /** Removes the attachment (without it, no remove button is shown) */
  onRemove?: () => void;
  /** Show a spinner overlay on the preview tile while the attachment uploads */
  loading?: boolean;
  /** Show an error indicator on the preview tile and style the item as errored */
  error?: string | null;
};

/** One attachment chip: preview tile, file name, and a remove button on hover */
export const Attachment = ({
  data,
  onRemove,
  loading,
  error,
  className,
  ...props
}: AttachmentProps) => {
  const label = data.filename ?? (data.mediaType.startsWith('image/') ? 'Image' : 'Attachment');

  return (
    <div
      className={cn(
        'group relative flex h-8 max-w-[320px] cursor-pointer select-none items-center gap-1.5',
        'rounded-md border border-border px-1.5 font-medium text-sm transition-all',
        'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        error && 'border-destructive',
        className,
      )}
      {...props}
      title={error ?? props.title}
    >
      <AttachmentPreview
        error={error}
        filename={data.filename}
        loading={loading}
        mediaType={data.mediaType}
        url={data.url}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {onRemove && (
        <Button
          aria-label="Remove"
          className="size-5 rounded p-0 opacity-0 transition-opacity group-hover:opacity-100 [&>svg]:size-2.5"
          onClick={(e) => {
            // Don't trigger the chip's own click handler
            e.stopPropagation();
            onRemove();
          }}
          type="button"
          variant="ghost"
        >
          <XIcon />
        </Button>
      )}
    </div>
  );
};
