import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { CHAT_FILE_TYPE_EXTENSIONS, CHAT_MAX_FILE_SIZE } from '@repo/constants';
import { chatSchema } from '@repo/schemas';
import { nanoid } from 'nanoid';
import { Resource } from 'sst';

import { orpc } from '@/core';
import { getCdnUrl } from '@/core/cdn';

import { protectedProcedure } from '../procedures';

const s3 = new S3Client({});

/** The uploads router — presigned URL generation for direct S3 uploads */
export const uploadsRouter = orpc.prefix('/uploads').router({
  /** Generate a presigned POST — enforces file size at the S3 level */
  createUploadUrl: protectedProcedure
    .route({
      method: 'POST',
      path: '/create-upload-url',
      summary: 'Generate a presigned S3 upload URL',
      tags: ['Uploads'],
    })
    .input(chatSchema.uploadInput)
    .handler(async ({ context, input }) => {
      const extension = CHAT_FILE_TYPE_EXTENSIONS[input.fileType];

      // Generate a unique S3 key scoped to the organization
      // Security boundary is the org (CloudFront cookies are org-scoped), not the conversation
      const fileId = nanoid();
      const key = `${context.organization.id}/${fileId}.${extension}`;

      // Create a presigned POST with content-length-range enforcement
      // This ensures S3 rejects uploads exceeding MAX_FILE_SIZE, even if the client lies about fileSize
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

      // Build the permanent CDN URL for this file
      const cdnUrl = getCdnUrl(key);

      return {
        /** Presigned POST URL */
        uploadUrl,
        /** Form fields to include with the POST */
        uploadFields: fields,
        /** Permanent CDN URL to store in the message parts */
        cdnUrl,
        /** The S3 object key */
        key,
      };
    }),
});
