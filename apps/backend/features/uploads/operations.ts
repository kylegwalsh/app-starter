import { CHAT_MAX_FILE_SIZE, getChatFileType } from '@repo/constants';
import type { chatSchema } from '@repo/schemas';
import { nanoid } from 'nanoid';
import type { z } from 'zod';

import { BadRequestError } from '@/api/error';
import type { AuthContext } from '@/services';
import { sandboxManager } from '@/services/daytona';
import { storage } from '@/services/storage';

/** Creates a presigned upload for a chat attachment so the browser can send it straight to S3 */
export const createUploadUrl = async (
  { fileName }: z.infer<typeof chatSchema.uploadInput>,
  { organization }: AuthContext,
) => {
  // The schema already checked the extension, but narrow it here for the type
  const fileType = getChatFileType(fileName);
  if (!fileType) {
    throw new BadRequestError('Unsupported file type');
  }

  // Files only code can open are useless without the sandbox
  if (fileType.sandboxOnly && !sandboxManager.isEnabled) {
    throw new BadRequestError(`.${fileType.extension} files aren't supported`);
  }

  // Unique S3 key scoped to the organization. The org prefix is the
  // security boundary — only members can request a signed read URL.
  // The nanoid prefix dedupes re-uploads of the same name; including the
  // original filename keeps debugging/S3 browsing legible.
  const key = `${organization.id}/${nanoid()}-${fileName}`;

  const [{ url: uploadUrl, fields }, viewUrl] = await Promise.all([
    storage.createUploadUrl({ key, contentType: fileType.mime, maxSizeBytes: CHAT_MAX_FILE_SIZE }),
    // Mint an initial signed GET URL for the just-uploaded file. Reading a
    // conversation re-signs it, so the stored URL doesn't need to live forever.
    // Override the download name so browsers don't show the nanoid-prefixed key.
    storage.signUrl({ key, downloadFilename: fileName }),
  ]);

  return {
    /** Presigned POST URL */
    uploadUrl,
    /** Form fields to include with the POST */
    uploadFields: fields,
    /** Signed GET URL — store this in the message part */
    viewUrl,
    /** The S3 object key */
    key,
  };
};
