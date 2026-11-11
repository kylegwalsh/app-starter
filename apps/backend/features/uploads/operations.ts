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

  // The org prefix scopes access to members, and the nanoid keeps same-named uploads from colliding
  const key = `${organization.id}/${nanoid()}-${fileName}`;

  const [{ url: uploadUrl, fields }, viewUrl] = await Promise.all([
    storage.createUploadUrl({ key, contentType: fileType.mime, maxSizeBytes: CHAT_MAX_FILE_SIZE }),
    storage.signUrl({ key, downloadFilename: fileName }),
  ]);

  return {
    /** The S3 URL the browser POSTs the file to */
    uploadUrl,
    /** Form fields that must be included in that POST */
    uploadFields: fields,
    /** Signed URL to show the file right away */
    viewUrl,
    /** The S3 object key, stored with the attachment to find the file later */
    key,
  };
};
