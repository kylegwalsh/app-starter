'use client';

import { Button } from '@repo/design/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@repo/design/components/ui/hover-card';
import { cn } from '@repo/design/lib/utils';
import type { FileUIPart, SourceDocumentUIPart } from 'ai';
import {
  AlertCircleIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  Loader2Icon,
  Music2Icon,
  PaperclipIcon,
  VideoIcon,
  XIcon,
} from 'lucide-react';
import type { ComponentProps, HTMLAttributes, ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export type AttachmentData =
  | (FileUIPart & { id: string })
  | (SourceDocumentUIPart & { id: string });

export type AttachmentMediaCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'source'
  | 'unknown';

export type AttachmentVariant = 'grid' | 'inline' | 'list';

const mediaCategoryIcons: Record<AttachmentMediaCategory, typeof ImageIcon> = {
  audio: Music2Icon,
  document: FileTextIcon,
  image: ImageIcon,
  source: GlobeIcon,
  unknown: PaperclipIcon,
  video: VideoIcon,
};

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
// Utility Functions
// ============================================================================

export const getMediaCategory = (data: AttachmentData): AttachmentMediaCategory => {
  if (data.type === 'source-document') {
    return 'source';
  }

  const mediaType = data.mediaType ?? '';

  if (mediaType.startsWith('image/')) {
    return 'image';
  }
  if (mediaType.startsWith('video/')) {
    return 'video';
  }
  if (mediaType.startsWith('audio/')) {
    return 'audio';
  }
  if (mediaType.startsWith('application/') || mediaType.startsWith('text/')) {
    return 'document';
  }

  return 'unknown';
};

export const getAttachmentLabel = (data: AttachmentData): string => {
  if (data.type === 'source-document') {
    return data.title || data.filename || 'Source';
  }

  const category = getMediaCategory(data);
  return data.filename || (category === 'image' ? 'Image' : 'Attachment');
};

/**
 * Image with an animated skeleton placeholder until the CDN image finishes loading.
 * The skeleton fades out and the image fades in on `onLoad`.
 */
const AttachmentImage = ({
  url,
  filename,
  isGrid,
  wrap,
}: {
  url: string;
  filename: string | undefined;
  isGrid: boolean;
  wrap?: (node: ReactNode) => ReactNode;
}) => {
  const [loaded, setLoaded] = useState(false);
  const img = (
    // oxlint-disable-next-line eslint-plugin-next(no-img-element): attachment previews are user-uploaded CDN images
    <img
      alt={filename || 'Image'}
      className={cn(
        'size-full object-cover transition-opacity duration-200',
        !isGrid && 'rounded',
        wrap && 'cursor-zoom-in',
        loaded ? 'opacity-100' : 'opacity-0',
      )}
      height={isGrid ? 96 : 20}
      onLoad={() => setLoaded(true)}
      src={url}
      width={isGrid ? 96 : 20}
    />
  );
  return (
    <>
      {!loaded && <div className="bg-muted absolute inset-0 animate-pulse" />}
      {wrap ? wrap(img) : img}
    </>
  );
};

// ============================================================================
// Contexts
// ============================================================================

interface AttachmentsContextValue {
  variant: AttachmentVariant;
}

const AttachmentsContext = createContext<AttachmentsContextValue | null>(null);

interface AttachmentContextValue {
  data: AttachmentData;
  mediaCategory: AttachmentMediaCategory;
  onRemove?: () => void;
  variant: AttachmentVariant;
  /** When true, render a spinner overlay on the preview tile */
  loading?: boolean;
  /** When set, render an error indicator on the preview tile and style the item as errored */
  error?: string | null;
}

const AttachmentContext = createContext<AttachmentContextValue | null>(null);

// ============================================================================
// Hooks
// ============================================================================

export const useAttachmentsContext = () =>
  useContext(AttachmentsContext) ?? { variant: 'grid' as const };

export const useAttachmentContext = () => {
  const ctx = useContext(AttachmentContext);
  if (!ctx) {
    throw new Error('Attachment components must be used within <Attachment>');
  }
  return ctx;
};

// ============================================================================
// Attachments - Container
// ============================================================================

export type AttachmentsProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AttachmentVariant;
};

export const Attachments = ({
  variant = 'grid',
  className,
  children,
  ...props
}: AttachmentsProps) => {
  const contextValue = useMemo(() => ({ variant }), [variant]);

  return (
    <AttachmentsContext.Provider value={contextValue}>
      <div
        className={cn(
          'flex items-start',
          variant === 'list' ? 'flex-col gap-2' : 'flex-wrap gap-2',
          variant === 'grid' && 'ml-auto w-fit',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </AttachmentsContext.Provider>
  );
};

// ============================================================================
// Attachment - Item
// ============================================================================

export type AttachmentProps = HTMLAttributes<HTMLDivElement> & {
  data: AttachmentData;
  onRemove?: () => void;
  /** Show a spinner overlay on the preview tile while the attachment uploads */
  loading?: boolean;
  /** Show an error indicator on the preview tile and style the item as errored */
  error?: string | null;
};

export const Attachment = ({
  data,
  onRemove,
  loading,
  error,
  className,
  children,
  ...props
}: AttachmentProps) => {
  const { variant } = useAttachmentsContext();
  const mediaCategory = getMediaCategory(data);

  const contextValue = useMemo<AttachmentContextValue>(
    () => ({ data, mediaCategory, onRemove, variant, loading, error }),
    [data, mediaCategory, onRemove, variant, loading, error],
  );

  return (
    <AttachmentContext.Provider value={contextValue}>
      <div
        className={cn(
          'group relative',
          variant === 'grid' && 'size-24 overflow-hidden rounded-lg',
          variant === 'inline' && [
            'flex h-8 max-w-[320px] cursor-pointer select-none items-center gap-1.5',
            'rounded-md border border-border px-1.5',
            'font-medium text-sm transition-all',
            'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
          ],
          variant === 'list' && [
            'flex w-full items-center gap-3 rounded-lg border p-3',
            'hover:bg-accent/50',
          ],
          error && 'border-destructive',
          className,
        )}
        {...props}
        title={error ?? props.title}
      >
        {children}
      </div>
    </AttachmentContext.Provider>
  );
};

// ============================================================================
// AttachmentPreview - Media preview
// ============================================================================

export type AttachmentPreviewProps = HTMLAttributes<HTMLDivElement> & {
  fallbackIcon?: ReactNode;
  /**
   * Optional wrapper around the rendered image element — useful for injecting
   * behavior like a zoom/lightbox without coupling this component to a specific
   * implementation. Only applied to image media; ignored for other types.
   */
  wrap?: (node: ReactNode) => ReactNode;
};

export const AttachmentPreview = ({
  fallbackIcon,
  wrap,
  className,
  ...props
}: AttachmentPreviewProps) => {
  const { data, mediaCategory, variant, loading, error } = useAttachmentContext();

  const iconSize = variant === 'inline' ? 'size-3' : 'size-4';
  const isImage = mediaCategory === 'image' && data.type === 'file' && data.url;
  const isVideo = mediaCategory === 'video' && data.type === 'file' && data.url;
  const isFileWithType = data.type === 'file' && !isImage && !isVideo;
  const tileStyle = isFileWithType ? getFileTileStyle(data.mediaType ?? '') : null;
  // Use the mime-specific coloured tile for file attachments (skipped for images/videos
  // which preview their own contents, and for source documents which aren't files).
  const useColouredTile = tileStyle !== null;

  const renderIcon = (Icon: typeof ImageIcon) => (
    <Icon className={cn(iconSize, 'text-muted-foreground')} />
  );

  const renderContent = () => {
    if (isImage && data.type === 'file' && data.url) {
      return (
        <AttachmentImage
          filename={data.filename}
          isGrid={variant === 'grid'}
          url={data.url}
          wrap={wrap}
        />
      );
    }

    if (isVideo && data.type === 'file' && data.url) {
      return <video className="size-full object-cover" muted src={data.url} />;
    }

    if (useColouredTile && tileStyle) {
      return <tileStyle.Icon className={cn(iconSize, 'text-white')} />;
    }

    const Icon = mediaCategoryIcons[mediaCategory];
    return fallbackIcon ?? renderIcon(Icon);
  };

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden',
        variant === 'grid' &&
          (useColouredTile ? ['size-full', tileStyle.iconBg] : 'size-full bg-muted'),
        variant === 'inline' &&
          (useColouredTile ? ['size-5 rounded', tileStyle.iconBg] : 'size-5 rounded bg-background'),
        variant === 'list' &&
          (useColouredTile ? ['size-12 rounded', tileStyle.iconBg] : 'size-12 rounded bg-muted'),
        className,
      )}
      {...props}
    >
      {renderContent()}
      {loading && (
        <div className="bg-background/70 absolute inset-0 flex items-center justify-center">
          <Loader2Icon className={cn(iconSize, 'animate-spin')} />
        </div>
      )}
      {!loading && error && (
        <div className="bg-background/70 absolute inset-0 flex items-center justify-center">
          <AlertCircleIcon className={cn(iconSize, 'text-destructive')} />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// AttachmentInfo - Name and type display
// ============================================================================

export type AttachmentInfoProps = HTMLAttributes<HTMLDivElement> & {
  showMediaType?: boolean;
};

export const AttachmentInfo = ({
  showMediaType = false,
  className,
  ...props
}: AttachmentInfoProps) => {
  const { data, variant } = useAttachmentContext();
  const label = getAttachmentLabel(data);

  if (variant === 'grid') {
    return null;
  }

  return (
    <div className={cn('min-w-0 flex-1', className)} {...props}>
      <span className="block truncate">{label}</span>
      {showMediaType && data.mediaType && (
        <span className="text-muted-foreground block truncate text-xs">{data.mediaType}</span>
      )}
    </div>
  );
};

// ============================================================================
// AttachmentRemove - Remove button
// ============================================================================

export type AttachmentRemoveProps = ComponentProps<typeof Button> & {
  label?: string;
};

export const AttachmentRemove = ({
  label = 'Remove',
  className,
  children,
  ...props
}: AttachmentRemoveProps) => {
  const { onRemove, variant } = useAttachmentContext();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.();
    },
    [onRemove],
  );

  if (!onRemove) {
    return null;
  }

  return (
    <Button
      aria-label={label}
      className={cn(
        variant === 'grid' && [
          'absolute top-2 right-2 size-6 rounded-full p-0',
          'bg-background/80 backdrop-blur-sm',
          'opacity-0 transition-opacity group-hover:opacity-100',
          'hover:bg-background',
          '[&>svg]:size-3',
        ],
        variant === 'inline' && [
          'size-5 rounded p-0',
          'opacity-0 transition-opacity group-hover:opacity-100',
          '[&>svg]:size-2.5',
        ],
        variant === 'list' && ['size-8 shrink-0 rounded p-0', '[&>svg]:size-4'],
        className,
      )}
      onClick={handleClick}
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <XIcon />}
      <span className="sr-only">{label}</span>
    </Button>
  );
};

// ============================================================================
// AttachmentHoverCard - Hover preview
// ============================================================================

export type AttachmentHoverCardProps = ComponentProps<typeof HoverCard>;

export const AttachmentHoverCard = ({
  openDelay = 0,
  closeDelay = 0,
  ...props
}: AttachmentHoverCardProps) => (
  <HoverCard closeDelay={closeDelay} openDelay={openDelay} {...props} />
);

export type AttachmentHoverCardTriggerProps = ComponentProps<typeof HoverCardTrigger>;

export const AttachmentHoverCardTrigger = (props: AttachmentHoverCardTriggerProps) => (
  <HoverCardTrigger {...props} />
);

export type AttachmentHoverCardContentProps = ComponentProps<typeof HoverCardContent>;

export const AttachmentHoverCardContent = ({
  align = 'start',
  className,
  ...props
}: AttachmentHoverCardContentProps) => (
  <HoverCardContent align={align} className={cn('w-auto p-2', className)} {...props} />
);

// ============================================================================
// AttachmentEmpty - Empty state
// ============================================================================

export type AttachmentEmptyProps = HTMLAttributes<HTMLDivElement>;

export const AttachmentEmpty = ({ className, children, ...props }: AttachmentEmptyProps) => (
  <div
    className={cn('flex items-center justify-center p-4 text-muted-foreground text-sm', className)}
    {...props}
  >
    {children ?? 'No attachments'}
  </div>
);
