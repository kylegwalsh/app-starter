import { config } from '@repo/config';

/** Get the base domain from the API URL (e.g., api.example.com -> example.com) */
export const getBaseDomain = () => {
  try {
    const hostname = new URL(config.api.url).hostname;
    const parts = hostname.split('.');
    return parts.slice(-2).join('.');
  } catch {
    return '';
  }
};

/** Get the CDN domain for the current stage (e.g., cdn.dev.example.com) */
export const getCdnDomain = () => {
  const baseDomain = getBaseDomain();
  const prefix = config.stage === 'prod' ? '' : `${config.stage}.`;
  return `cdn.${prefix}${baseDomain}`;
};

/** Build a permanent CDN URL for an S3 key. Falls back to a placeholder in local dev. */
export const getCdnUrl = (key: string) => {
  if (config.hasCustomDomain) {
    return `https://${getCdnDomain()}/${key}`;
  }
  // In local dev without CloudFront, return a path-based URL that can be resolved later
  return `/uploads/${key}`;
};
