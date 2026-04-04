/** Maximum file size for chat uploads (10MB) */
export const CHAT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Allowed MIME types for chat file uploads */
export const CHAT_ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
] as const;

/** Map from MIME type to file extension */
export const CHAT_FILE_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
