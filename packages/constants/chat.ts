/** Maximum file size for chat uploads (10MB) */
export const CHAT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/** File types the model reads directly: MIME type → file extension */
export const CHAT_FILE_TYPES = {
  // Images
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  // PDF
  'application/pdf': 'pdf',
  // Word
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  // Excel
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  // Text
  'text/plain': 'txt',
  'text/csv': 'csv',
  'text/markdown': 'md',
  'text/html': 'html',
} as const;

/**
 * File types only code can open: MIME type → file extension. Accepted only when the code sandbox
 * (Daytona) is enabled, which copies every upload in when a code tool first runs.
 */
export const CHAT_SANDBOX_FILE_TYPES = {
  'application/json': 'json',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'text/tab-separated-values': 'tsv',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
} as const;

/** The MIME type of a file that can be uploaded to chat */
export type ChatFileMimeType = keyof typeof CHAT_FILE_TYPES | keyof typeof CHAT_SANDBOX_FILE_TYPES;

/** Non-empty tuple of every uploadable MIME type — derived for `z.enum()` */
export const CHAT_ALLOWED_FILE_TYPES = [
  ...Object.keys(CHAT_FILE_TYPES),
  ...Object.keys(CHAT_SANDBOX_FILE_TYPES),
] as [ChatFileMimeType, ...ChatFileMimeType[]];
