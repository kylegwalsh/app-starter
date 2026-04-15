import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '@repo/config';
import { NextResponse } from 'next/server';
import { Resource } from 'sst';

/**
 * Dev-only proxy for S3 uploads — generates a presigned GET URL and redirects.
 * In production, files are served directly through CloudFront.
 */
export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (config.hasCustomDomain) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { key } = await params;
  const s3Key = key.join('/');
  const s3 = new S3Client({});

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: Resource.uploads.name, Key: s3Key }),
    { expiresIn: 3600 },
  );

  return NextResponse.redirect(url);
}
