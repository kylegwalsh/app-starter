import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Resource } from 'sst';

/** Default TTL for presigned GET URLs */
const SIGN_TTL_SECONDS = 60 * 60 * 24;

const s3 = new S3Client({});

/** Builds an RFC 5987-compliant Content-Disposition header value. */
const inlineDisposition = (filename: string): string => {
  const safe = filename.replaceAll(/[\\"]/g, '');
  const encoded = encodeURIComponent(filename);
  return `inline; filename="${safe}"; filename*=UTF-8''${encoded}`;
};

/** Methods related to our private uploads bucket */
export const storage = {
  /** S3 key for a URL on our bucket, or null if the URL points elsewhere. */
  keyFromUrl: ({ url }: { url: URL }): string | null => {
    const bucket = Resource.uploads.name;
    const isOurBucket =
      url.hostname === `${bucket}.s3.amazonaws.com` || url.hostname.startsWith(`${bucket}.s3.`);
    if (!isOurBucket) {
      return null;
    }
    // `url.pathname` is percent-encoded; S3 stores keys with their raw bytes,
    // so decode before returning. Spaces, parens, etc. need this round-trip.
    const decoded = decodeURIComponent(url.pathname);
    return decoded.replace(/^\/+/, '') || null;
  },

  /**
   * Mint a short-lived presigned GET URL for a stored object. The caller is
   * responsible for verifying that the recipient is allowed to read the file.
   * Pass `downloadFilename` to set the browser-side download name; otherwise
   * the URL's path tail is used.
   */
  signUrl: ({
    key,
    downloadFilename,
    expiresInSeconds = SIGN_TTL_SECONDS,
  }: {
    key: string;
    downloadFilename?: string;
    expiresInSeconds?: number;
  }): Promise<string> =>
    getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: Resource.uploads.name,
        Key: key,
        ResponseContentDisposition: downloadFilename
          ? inlineDisposition(downloadFilename)
          : undefined,
      }),
      { expiresIn: expiresInSeconds },
    ),

  /** Read object bytes directly using the Lambda's IAM creds. */
  read: async ({
    key,
  }: {
    key: string;
  }): Promise<{ data: Uint8Array; mediaType: string | undefined } | null> => {
    const object = await s3.send(new GetObjectCommand({ Bucket: Resource.uploads.name, Key: key }));
    if (!object.Body) {
      return null;
    }
    return {
      data: await object.Body.transformToByteArray(),
      mediaType: object.ContentType ?? undefined,
    };
  },
};
