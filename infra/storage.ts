import { CLOUDFRONT_PUBLIC_KEY } from './secrets';
import { domain } from './utils';

// Private S3 bucket for chat file uploads
export const uploadsBucket = new sst.aws.Bucket('uploads', {
  access: 'cloudfront',
});

// CloudFront key group for signed cookies
const cloudfrontPublicKey = new aws.cloudfront.PublicKey('uploadsCdnPublicKey', {
  encodedKey: CLOUDFRONT_PUBLIC_KEY.value,
  name: `uploads-cdn-public-key-${$app.stage}`,
});

const keyGroup = new aws.cloudfront.KeyGroup('uploadsCdnKeyGroup', {
  items: [cloudfrontPublicKey.id],
  name: `uploads-cdn-key-group-${$app.stage}`,
});

// CloudFront distribution serving uploaded files with signed cookie auth
export const uploadsCdn = new sst.aws.Cdn('uploadsCdn', {
  comment: `Chat file uploads CDN (${$app.stage})`,
  domain: domain ? `cdn.${domain}` : undefined,
  origins: [
    {
      domainName: uploadsBucket.domain,
      originId: 'uploads',
      s3OriginConfig: {
        originAccessIdentity: '',
      },
    },
  ],
  defaultCacheBehavior: {
    targetOriginId: 'uploads',
    viewerProtocolPolicy: 'redirect-to-https',
    allowedMethods: ['GET', 'HEAD'],
    cachedMethods: ['GET', 'HEAD'],
    forwardedValues: {
      queryString: false,
      cookies: { forward: 'none' },
    },
    // Require signed cookies to access files
    trustedKeyGroups: [keyGroup.id],
  },
});
