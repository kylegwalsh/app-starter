import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { CHAT_MAX_FILE_SIZE } from '@repo/constants';
import { chatSchema } from '@repo/schemas';
import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';
import { nanoid } from 'nanoid';
import { Resource } from 'sst';

import { storage } from '@/core/storage';

import { type ProtectedEnv, requireAuth } from '../middleware';

const s3 = new S3Client({});

/** The uploads router — presigned URL generation for direct S3 uploads */
export const uploadsRouter = new Hono<ProtectedEnv>().use(requireAuth).post(
  '/uploads/create-upload-url',
  describeRoute({
    summary: 'Generate a presigned S3 upload URL',
    tags: ['Uploads'],
  }),
  validator('json', chatSchema.uploadInput),
  async (c) => {
    const input = c.req.valid('json');
    const organization = c.get('organization');

    // Unique S3 key scoped to the organization. The org prefix is the
    // security boundary — only members can request a signed read URL.
    // The nanoid prefix dedupes re-uploads of the same name; including the
    // original filename keeps debugging/S3 browsing legible.
    const fileId = nanoid();
    const key = `${organization.id}/${fileId}-${input.fileName}`;

    // Presigned POST with content-length-range — S3 rejects oversize uploads
    // even if the client lies about fileSize.
    const { url: uploadUrl, fields } = await createPresignedPost(s3, {
      Bucket: Resource.uploads.name,
      Key: key,
      Conditions: [
        ['content-length-range', 0, CHAT_MAX_FILE_SIZE],
        ['eq', '$Content-Type', input.fileType],
      ],
      Fields: {
        'Content-Type': input.fileType,
      },
      Expires: 300, // 5 min
    });

    // Mint an initial signed GET URL for the just-uploaded file. `chat.get`
    // re-signs on read, so the stored URL doesn't need to live forever.
    // Override the download name so browsers don't show the nanoid-prefixed key.
    const viewUrl = await storage.signUrl({ key, downloadFilename: input.fileName });

    return c.json({
      /** Presigned POST URL */
      uploadUrl,
      /** Form fields to include with the POST */
      uploadFields: fields,
      /** Signed GET URL — store this in the message part */
      viewUrl,
      /** The S3 object key */
      key,
    });
  },
);
