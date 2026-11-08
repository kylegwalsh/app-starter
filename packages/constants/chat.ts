/** Maximum file size for chat uploads (10MB) */
export const CHAT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Broad category of a file, used to pick its icon */
export type ChatFileKind =
  | 'image'
  | 'pdf'
  | 'word'
  | 'spreadsheet'
  | 'presentation'
  | 'archive'
  | 'code'
  | 'text';

/** What chat knows about a file type (see `CHAT_FILE_TYPES`) */
export type ChatFileType = {
  /** Canonical MIME type we store and send with the file */
  mime: string;
  /** Broad category, used for the file's icon */
  kind: ChatFileKind;
  /** Only code can open it, so it's accepted only when the code sandbox is enabled */
  sandboxOnly?: boolean;
};

/** Every file type chat accepts, keyed by extension */
export const CHAT_FILE_TYPES = {
  // Images
  jpg: { mime: 'image/jpeg', kind: 'image' },
  jpeg: { mime: 'image/jpeg', kind: 'image' },
  png: { mime: 'image/png', kind: 'image' },
  gif: { mime: 'image/gif', kind: 'image' },
  webp: { mime: 'image/webp', kind: 'image' },
  // Documents
  pdf: { mime: 'application/pdf', kind: 'pdf' },
  doc: { mime: 'application/msword', kind: 'word' },
  docx: {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    kind: 'word',
  },
  xls: { mime: 'application/vnd.ms-excel', kind: 'spreadsheet' },
  xlsx: {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    kind: 'spreadsheet',
  },
  // Text
  txt: { mime: 'text/plain', kind: 'text' },
  csv: { mime: 'text/csv', kind: 'spreadsheet' },
  md: { mime: 'text/markdown', kind: 'text' },
  html: { mime: 'text/html', kind: 'code' },
  // Only code can open these
  pptx: {
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    kind: 'presentation',
    sandboxOnly: true,
  },
  tsv: { mime: 'text/tab-separated-values', kind: 'spreadsheet', sandboxOnly: true },
  zip: { mime: 'application/zip', kind: 'archive', sandboxOnly: true },
  log: { mime: 'text/x-log', kind: 'text', sandboxOnly: true },
  // Code, config and data
  json: { mime: 'application/json', kind: 'code', sandboxOnly: true },
  jsonl: { mime: 'application/x-ndjson', kind: 'code', sandboxOnly: true },
  ndjson: { mime: 'application/x-ndjson', kind: 'code', sandboxOnly: true },
  ipynb: { mime: 'application/x-ipynb+json', kind: 'code', sandboxOnly: true },
  xml: { mime: 'application/xml', kind: 'code', sandboxOnly: true },
  yaml: { mime: 'application/yaml', kind: 'code', sandboxOnly: true },
  yml: { mime: 'application/yaml', kind: 'code', sandboxOnly: true },
  toml: { mime: 'application/toml', kind: 'code', sandboxOnly: true },
  ini: { mime: 'text/x-ini', kind: 'code', sandboxOnly: true },
  sql: { mime: 'application/sql', kind: 'code', sandboxOnly: true },
  sh: { mime: 'application/x-sh', kind: 'code', sandboxOnly: true },
  css: { mime: 'text/css', kind: 'code', sandboxOnly: true },
  py: { mime: 'text/x-python', kind: 'code', sandboxOnly: true },
  js: { mime: 'text/javascript', kind: 'code', sandboxOnly: true },
  jsx: { mime: 'text/javascript', kind: 'code', sandboxOnly: true },
  ts: { mime: 'text/typescript', kind: 'code', sandboxOnly: true },
  tsx: { mime: 'text/typescript', kind: 'code', sandboxOnly: true },
} as const satisfies Record<string, ChatFileType>;

/** A file extension chat accepts, e.g. `pdf` */
export type ChatFileExtension = keyof typeof CHAT_FILE_TYPES;

/** The lowercase extension of a file name (the last dot segment), or undefined if it has none */
export const getFileExtension = (fileName: string | undefined) => {
  const dot = fileName?.lastIndexOf('.') ?? -1;
  return dot > 0 && fileName ? fileName.slice(dot + 1).toLowerCase() : undefined;
};

/** Whether a string is an extension in `CHAT_FILE_TYPES` */
const isChatFileExtension = (extension: string): extension is ChatFileExtension =>
  Object.hasOwn(CHAT_FILE_TYPES, extension);

/** Looks up a file's chat type by its name's extension (undefined if chat doesn't accept it) */
export const getChatFileType = (fileName: string | undefined) => {
  const extension = getFileExtension(fileName);
  if (!extension || !isChatFileExtension(extension)) {
    return;
  }
  const fileType: ChatFileType = CHAT_FILE_TYPES[extension];
  return { extension, ...fileType };
};
