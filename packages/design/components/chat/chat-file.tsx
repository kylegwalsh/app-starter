'use client';

import { type ChatFileKind, getChatFileType, getFileExtension } from '@repo/constants';
import { cn } from '@repo/design/lib/utils';
import {
  FileArchiveIcon,
  FileCodeIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  PresentationIcon,
} from 'lucide-react';

export type FileTileStyle = {
  /** The file-type icon */
  Icon: typeof ImageIcon;
  /** Background color class for the icon's tile */
  iconBg: string;
};

/** The icon and tile color for each kind of file (the kind comes from `CHAT_FILE_TYPES`) */
const TILE_STYLES = {
  image: { Icon: ImageIcon, iconBg: 'bg-muted-foreground' },
  pdf: { Icon: FileTextIcon, iconBg: 'bg-red-500/80' },
  word: { Icon: FileTextIcon, iconBg: 'bg-blue-600/80' },
  spreadsheet: { Icon: FileSpreadsheetIcon, iconBg: 'bg-emerald-600/80' },
  presentation: { Icon: PresentationIcon, iconBg: 'bg-orange-500/80' },
  archive: { Icon: FileArchiveIcon, iconBg: 'bg-amber-600/80' },
  code: { Icon: FileCodeIcon, iconBg: 'bg-sky-600/80' },
  text: { Icon: FileTextIcon, iconBg: 'bg-slate-500/80' },
} satisfies Record<ChatFileKind, FileTileStyle>;

/** The icon and color for a file, shared by message attachments and staged attachments */
export const getFileTileStyle = (fileName: string | undefined): FileTileStyle => {
  const kind = getChatFileType(fileName)?.kind;
  return kind ? TILE_STYLES[kind] : { Icon: FileIcon, iconBg: 'bg-muted-foreground' };
};

export type ChatFileProps = {
  /** Where to open the file; without one the card isn't a link */
  url: string | undefined;
  /** The file's name */
  filename: string | undefined;
};

/** Card for a non-image attachment, with a file-type icon, name and type label */
export const ChatFile = ({ url, filename }: ChatFileProps) => {
  const { Icon, iconBg } = getFileTileStyle(filename);
  const typeLabel = (getFileExtension(filename) ?? 'file').toUpperCase();
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
