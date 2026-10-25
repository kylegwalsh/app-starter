import { log } from '@repo/logs';
import type { UIMessage } from 'ai';

import { storage } from '@/services/storage';

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
