import { PrivateKey } from '@pulumi/tls';

import { domain } from './utils';

// Private S3 bucket for chat file uploads
export const uploadsBucket = new sst.aws.Bucket('uploads', {
  access: 'cloudfront',
});

// Generate the RSA key pair in Pulumi state — no manual key management needed.
// The private key is encrypted in SST's S3 state backend. Rotating means running
// `sst state delete uploadsCdnKeyPair` then redeploying to generate a fresh pair.
const keyPair = new PrivateKey('uploadsCdnKeyPair', {
  algorithm: 'RSA',
  rsaBits: 2048,
});

const cloudfrontPublicKey = new aws.cloudfront.PublicKey('uploadsCdnPublicKey', {
  encodedKey: keyPair.publicKeyPem,
  name: `uploads-cdn-public-key-${$app.stage}`,
});

const keyGroup = new aws.cloudfront.KeyGroup('uploadsCdnKeyGroup', {
  items: [cloudfrontPublicKey.id],
  name: `uploads-cdn-key-group-${$app.stage}`,
});

// Link the key pair ID and private key to the backend so it can sign cookies.
// Both values are injected at runtime via Resource.uploadsCdnKeyPair.
export const uploadsCdnKeyPair = new sst.Linkable('uploadsCdnKeyPair', {
  properties: {
    id: cloudfrontPublicKey.id,
    privateKey: $util.secret(keyPair.privateKeyPem),
  },
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
