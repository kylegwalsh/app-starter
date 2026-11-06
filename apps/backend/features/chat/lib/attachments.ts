import type { Sandbox } from '@daytonaio/sdk';
import { log } from '@repo/logs';
import { type FileUIPart, isFileUIPart, type UIMessage } from 'ai';

import { sandboxManager } from '@/services/daytona';
import { storage } from '@/services/storage';

/** Where a conversation's attachments are copied in its sandbox */
export const SANDBOX_UPLOADS_DIR = '/home/daytona/uploads';

// What Bedrock's Converse API can read (anything else is rejected and fails the whole turn).
// The caps apply to the whole request, and every turn resends the full history.
const MODEL_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MODEL_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/html',
  'text/plain',
  'text/markdown',
]);
const MODEL_LIMITS = {
  image: { maxBytes: 3_750_000, maxCount: 20 },
  document: { maxBytes: 4_500_000, maxCount: 5 },
} as const;

/** Why an attachment isn't sent to the model */
type UnreadableReason = 'type' | 'size' | 'count' | 'missing';

/** A conversation's attachment, with its S3 key and its path in the sandbox */
type Upload = { part: FileUIPart; key: string; sandboxPath: string };

// ---------- HELPERS ----------
/** The S3 key of an attachment on our bucket, or null if it points elsewhere */
const keyFromPart = (part: FileUIPart) => {
  try {
    return storage.keyFromUrl({ url: new URL(part.url) });
  } catch {
    return null;
  }
};

/** A file name that's safe as a path segment and not already taken, e.g. `report (2).pdf` */
const uniqueFileName = (name: string, taken: Set<string>) => {
  const safe = name.replaceAll(/[/\\]/g, '_').trim() || 'file';
  const dot = safe.lastIndexOf('.');
  const [stem, extension] = dot > 0 ? [safe.slice(0, dot), safe.slice(dot)] : [safe, ''];
  let candidate = safe;
  for (let copy = 2; taken.has(candidate); copy += 1) {
    candidate = `${stem} (${copy})${extension}`;
  }
  taken.add(candidate);
  return candidate;
};

/** Formats a byte count for a note, e.g. `6.2 MB` */
const formatBytes = (bytes: number) =>
  bytes < 1_000_000 ? `${Math.ceil(bytes / 1000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;

/** Why the model can't read an attachment, as worded in its note */
const UNREADABLE_BECAUSE = {
  type: `isn't a format you can read directly`,
  size: 'is too large for you to read directly',
  count: 'was left out because the conversation has more attachments than you can read at once',
} as const;

/** The note the model sees in place of (or beside) an attachment, if it needs one */
const attachmentNote = (upload: Upload, size: number | null, reason?: UnreadableReason) => {
  const name = JSON.stringify(upload.part.filename ?? upload.sandboxPath.split('/').at(-1));
  if (reason === 'missing') {
    return `[Attachment ${name} is no longer available; attachments expire after 60 days.]`;
  }
  // Only worth mentioning when there are code tools to open it with
  const location = sandboxManager.isEnabled
    ? `saved in the code sandbox at ${upload.sandboxPath}`
    : undefined;
  if (!reason) {
    return location && `[Attachment ${name} is also ${location}.]`;
  }
  const details = `${upload.part.mediaType}, ${formatBytes(size ?? 0)}`;
  return `[Attachment ${name} (${details}) ${UNREADABLE_BECAUSE[reason]}.${location ? ` It's ${location}.` : ''}]`;
};

// ---------- ATTACHMENTS ----------
/** Lists a conversation's attachments in order, giving each a unique path in the sandbox */
export const listUploads = (messages: Pick<UIMessage, 'parts'>[]): Upload[] => {
  const taken = new Set<string>();
  return messages
    .flatMap((message) => message.parts.filter((part) => isFileUIPart(part)))
    .flatMap((part) => {
      const key = keyFromPart(part);
      if (!key) {
        return [];
      }
      const name = uniqueFileName(part.filename ?? key.split('/').at(-1) ?? 'file', taken);
      return [{ part, key, sandboxPath: `${SANDBOX_UPLOADS_DIR}/${name}` }];
    });
};

/**
 * Decides which attachments the model can read. Unsupported types, oversized files and missing
 * ones can't be read; past the image and document caps, the newest files win.
 */
export const routeAttachments = (
  uploads: Pick<Upload, 'part'>[],
  sizes: ReadonlyArray<number | null>,
): Array<UnreadableReason | undefined> => {
  const counts = { image: 0, document: 0 };
  const unreadable = new Map<number, UnreadableReason>();
  // Walk newest to oldest so the caps keep the latest attachments
  for (let index = uploads.length - 1; index >= 0; index -= 1) {
    const { mediaType } = uploads[index].part;
    const size = sizes[index];
    let kind: keyof typeof MODEL_LIMITS | undefined;
    if (MODEL_IMAGE_TYPES.has(mediaType)) {
      kind = 'image';
    } else if (MODEL_DOCUMENT_TYPES.has(mediaType)) {
      kind = 'document';
    }

    if (size === null) {
      unreadable.set(index, 'missing');
    } else if (!kind) {
      unreadable.set(index, 'type');
    } else if (size > MODEL_LIMITS[kind].maxBytes) {
      unreadable.set(index, 'size');
    } else if (counts[kind] >= MODEL_LIMITS[kind].maxCount) {
      unreadable.set(index, 'count');
    } else {
      counts[kind] += 1;
    }
  }
  return uploads.map((_, index) => unreadable.get(index));
};

/**
 * Returns the messages the model should see: readable attachments stay (with a note giving their
 * sandbox path, if there's a sandbox), and the rest are replaced by a note saying why.
 */
export const prepareAttachmentsForModel = async (messages: UIMessage[]): Promise<UIMessage[]> => {
  const uploads = listUploads(messages);
  if (uploads.length === 0) {
    return messages;
  }
  const sizes = await Promise.all(uploads.map(({ key }) => storage.size({ key })));
  const reasons = routeAttachments(uploads, sizes);
  const notes = new Map(
    uploads.map((upload, index) => [
      upload.part,
      { readable: !reasons[index], text: attachmentNote(upload, sizes[index], reasons[index]) },
    ]),
  );

  return messages.map((message) => ({
    ...message,
    parts: message.parts.flatMap((part) => {
      const note = isFileUIPart(part) ? notes.get(part) : undefined;
      if (!note?.text) {
        return [part];
      }
      const text = { type: 'text' as const, text: note.text };
      return note.readable ? [part, text] : [text];
    }),
  }));
};

/** Copies the conversation's attachments into its sandbox (skipping ones already there) */
export const copyUploadsToSandbox = async (sandbox: Sandbox, messages: UIMessage[]) => {
  const uploads = listUploads(messages);
  if (uploads.length === 0) {
    return;
  }
  const present = await sandbox.fs.listFiles(SANDBOX_UPLOADS_DIR).catch(async () => {
    await sandbox.fs.createFolder(SANDBOX_UPLOADS_DIR, '755');
    return [];
  });
  const presentPaths = new Set(present.map((file) => `${SANDBOX_UPLOADS_DIR}/${file.name}`));

  await Promise.all(
    uploads
      .filter(({ sandboxPath }) => !presentPaths.has(sandboxPath))
      .map(async ({ key, sandboxPath }) => {
        try {
          const object = await storage.read({ key });
          if (object) {
            await sandbox.fs.uploadFile(Buffer.from(object.data), sandboxPath);
          }
        } catch (error) {
          // An expired upload just isn't copied; the model was told it's gone
          log.warn({ err: error, key }, 'chat: failed to copy upload into sandbox');
        }
      }),
  );
};

// ---------- MODEL INPUT ----------
/** Reads uploads straight from S3, since their stored signed URLs may have expired */
export const downloadUploadsFromS3 = async (
  requested: ReadonlyArray<{ url: URL; isUrlSupportedByModel: boolean }>,
) =>
  Promise.all(
    requested.map(async (req) => {
      if (req.isUrlSupportedByModel) {
        return null;
      }
      const key = storage.keyFromUrl({ url: req.url });
      if (!key) {
        return null;
      }
      try {
        const result = await storage.read({ key });
        if (!result) {
          throw new Error(`Empty body for uploads object: ${key}`);
        }
        return result;
      } catch (error) {
        log.error({ err: error, key }, 'chat: failed to read uploads object');
        throw error;
      }
    }),
  );

/** Replaces characters Bedrock rejects in file names (it allows letters, digits, spaces, -()[]) */
const sanitizeBedrockFilename = (name: string): string => {
  const cleaned = name
    .replaceAll(/[^a-zA-Z0-9\s\-()[\]]/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
  return cleaned.length > 0 ? cleaned : 'file';
};

/** Makes file names Bedrock-safe and unique (Bedrock rejects duplicates) */
export const sanitizeFileFilenames = (messages: UIMessage[]): UIMessage[] => {
  let index = 0;
  return messages.map((m) => ({
    ...m,
    parts: m.parts.map((p) => {
      if (p.type !== 'file' || !p.filename) {
        return p;
      }
      index += 1;
      return { ...p, filename: `${sanitizeBedrockFilename(p.filename)} (${index})` };
    }),
  }));
};

/** Re-signs stored file URLs, which may have expired since they were first signed */
export const signFileUrls = async (parts: UIMessage['parts']): Promise<UIMessage['parts']> =>
  Promise.all(
    parts.map(async (p) => {
      if (p.type !== 'file' || typeof (p as { url?: unknown }).url !== 'string') {
        return p;
      }
      const stored = (p as { url: string }).url;
      try {
        const key = storage.keyFromUrl({ url: new URL(stored) });
        if (!key) {
          return p;
        }
        return { ...p, url: await storage.signUrl({ key, downloadFilename: p.filename }) };
      } catch {
        return p;
      }
    }),
  );
