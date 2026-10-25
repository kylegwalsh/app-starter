import { chatSchema } from '@repo/schemas';
import { Hono } from 'hono';
import { describeRoute, validator } from 'hono-openapi';

import { type ProtectedEnv, requireAuth } from '@/api/middleware';

import { createUploadUrl } from './operations';

/** The uploads router — presigned URL generation for direct S3 uploads */
export const uploadsRouter = new Hono<ProtectedEnv>().use(requireAuth).post(
  '/uploads/create-upload-url',
  describeRoute({
    summary: 'Generate a presigned S3 upload URL',
    tags: ['Uploads'],
  }),
  validator('json', chatSchema.uploadInput),
  async (c) => c.json(await createUploadUrl(c.req.valid('json'), c.var)),
);
