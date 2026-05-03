/** Maximum file size for chat uploads (10MB) */
export const CHAT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/** All supported file types for chat uploads: MIME type → file extension */
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

/** The MIME type of a file that can be uploaded to chat */
export type ChatFileMimeType = keyof typeof CHAT_FILE_TYPES;

/** Non-empty tuple of allowed MIME types — derived for `z.enum()` and the HTML `accept` attribute */
export const CHAT_ALLOWED_FILE_TYPES = Object.keys(CHAT_FILE_TYPES) as [
  ChatFileMimeType,
  ...ChatFileMimeType[],
];
