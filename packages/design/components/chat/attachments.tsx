'use client';

import { Button } from '@repo/design/components/ui/button';
import { cn } from '@repo/design/lib/utils';
import type { FileUIPart } from 'ai';
import {
  AlertCircleIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  type ImageIcon,
  Loader2Icon,
  Music2Icon,
  VideoIcon,
  XIcon,
} from 'lucide-react';
import type { ComponentProps, HTMLAttributes } from 'react';
import { createContext, useContext, useState } from 'react';

// ============================================================================
// File tiles
// ============================================================================

const WORD_MIME_TYPES = new Set<string>([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const SPREADSHEET_MIME_TYPES = new Set<string>([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
]);

export type FileTileStyle = {
  Icon: typeof ImageIcon;
  iconBg: string;
};

/**
 * Maps a mime type to a coloured icon-tile style — shared between the message
 * attachment card and the inline attachment preview so the two read as a set.
 */
export const getFileTileStyle = (mediaType: string): FileTileStyle => {
  if (mediaType === 'application/pdf') {
    return { Icon: FileTextIcon, iconBg: 'bg-red-500/80' };
  }
  if (WORD_MIME_TYPES.has(mediaType)) {
    return { Icon: FileTextIcon, iconBg: 'bg-blue-600/80' };
  }
  if (SPREADSHEET_MIME_TYPES.has(mediaType)) {
    return { Icon: FileSpreadsheetIcon, iconBg: 'bg-emerald-600/80' };
  }
  if (mediaType.startsWith('audio/')) {
    return { Icon: Music2Icon, iconBg: 'bg-purple-500/80' };
  }
  if (mediaType.startsWith('video/')) {
    return { Icon: VideoIcon, iconBg: 'bg-pink-500/80' };
  }
  if (mediaType.startsWith('text/')) {
    return { Icon: FileTextIcon, iconBg: 'bg-slate-500/80' };
  }
  return { Icon: FileIcon, iconBg: 'bg-muted-foreground' };
};

// ============================================================================
// Attachments
// ============================================================================

/** A staged file */
export type AttachmentData = FileUIPart & { id: string };

type AttachmentContextValue = {
  data: AttachmentData;
  onRemove?: () => void;
  loading?: boolean;
  error?: string | null;
};

const AttachmentContext = createContext<AttachmentContextValue | null>(null);

const useAttachmentContext = () => {
  const context = useContext(AttachmentContext);
  if (!context) {
    throw new Error('Attachment components must be used within <Attachment>');
  }
  return context;
};

export type AttachmentsProps = HTMLAttributes<HTMLDivElement>;

/** A wrapping row of attachment chips */
export const Attachments = ({ className, ...props }: AttachmentsProps) => (
  <div className={cn('flex flex-wrap items-start gap-2', className)} {...props} />
);

export type AttachmentProps = HTMLAttributes<HTMLDivElement> & {
  data: AttachmentData;
  onRemove?: () => void;
  /** Show a spinner overlay on the preview tile while the attachment uploads */
  loading?: boolean;
  /** Show an error indicator on the preview tile and style the item as errored */
  error?: string | null;
};

/** One attachment chip; compose it from `AttachmentPreview`, `AttachmentInfo` and `AttachmentRemove` */
export const Attachment = ({
  data,
  onRemove,
  loading,
  error,
  className,
  ...props
}: AttachmentProps) => (
  <AttachmentContext value={{ data, onRemove, loading, error }}>
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
    />
  </AttachmentContext>
);

export type AttachmentPreviewProps = HTMLAttributes<HTMLDivElement>;

/** The attachment's thumbnail (images) or coloured file-type tile, with upload state */
export const AttachmentPreview = ({ className, ...props }: AttachmentPreviewProps) => {
  const { data, loading, error } = useAttachmentContext();
  const [loaded, setLoaded] = useState(false);
  const isImage = data.mediaType.startsWith('image/');
  const tile = isImage ? undefined : getFileTileStyle(data.mediaType);

  return (
    <div
      className={cn(
        'relative flex size-5 shrink-0 items-center justify-center overflow-hidden rounded',
        tile ? tile.iconBg : 'bg-background',
        className,
      )}
      {...props}
    >
      {tile && <tile.Icon className="size-3 text-white" />}
      {isImage && !loaded && <div className="bg-muted absolute inset-0 animate-pulse" />}
      {isImage && (
        // oxlint-disable-next-line next/no-img-element -- previews are local blob URLs
        <img
          alt={data.filename ?? 'Image'}
          className={cn(
            'size-full rounded object-cover transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          height={20}
          onLoad={() => setLoaded(true)}
          src={data.url}
          width={20}
        />
      )}
      {loading && (
        <div className="bg-background/70 absolute inset-0 flex items-center justify-center">
          <Loader2Icon className="size-3 animate-spin" />
        </div>
      )}
      {!loading && error && (
        <div className="bg-background/70 absolute inset-0 flex items-center justify-center">
          <AlertCircleIcon className="text-destructive size-3" />
        </div>
      )}
    </div>
  );
};

export type AttachmentInfoProps = HTMLAttributes<HTMLDivElement>;

/** The attachment's file name */
export const AttachmentInfo = ({ className, ...props }: AttachmentInfoProps) => {
  const { data } = useAttachmentContext();
  const label = data.filename ?? (data.mediaType.startsWith('image/') ? 'Image' : 'Attachment');
  return (
    <div className={cn('min-w-0 flex-1', className)} {...props}>
      <span className="block truncate">{label}</span>
    </div>
  );
};

export type AttachmentRemoveProps = ComponentProps<typeof Button> & {
  label?: string;
};

/** A remove button, shown on hover when the attachment has `onRemove` */
export const AttachmentRemove = ({
  label = 'Remove',
  className,
  children,
  ...props
}: AttachmentRemoveProps) => {
  const { onRemove } = useAttachmentContext();
  if (!onRemove) {
    return null;
  }
  return (
    <Button
      aria-label={label}
      className={cn(
        'size-5 rounded p-0 opacity-0 transition-opacity group-hover:opacity-100 [&>svg]:size-2.5',
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <XIcon />}
    </Button>
  );
};
