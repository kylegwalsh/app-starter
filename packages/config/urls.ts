import { resources } from './cloud-resources';

// oxlint-disable no-explicit-any: We need the backend to build and ignore the window
declare const window: any;

// Extract only resource keys that have a `url` property (e.g. 'web', 'admin', 'api')
type ResourceWithUrl = {
  [K in keyof typeof resources]: (typeof resources)[K] extends { url: string } ? K : never;
}[keyof typeof resources];

/**
 * Resolve a URL for an SST resource. In the browser, returns `window.location.origin`
 * (the current app's own URL). On the backend, reads the SST resource URL directly.
 * Falls back to a local dev URL when SST returns a dev-mode placeholder.
 */
const resolveWebAppUrl = ({
  resource,
  localUrl,
  dedicatedUrl,
}: {
  /** If we're running in the backend, the resource contains the accurate URL */
  resource: ResourceWithUrl;
  /** If we're running in the backend locally, we'd fall back to this URL because resource isn't defined */
  localUrl: string;
  /** If we're running in the frontend, we sometimes have a direct URL provided and should be our first pick */
  dedicatedUrl?: string;
}) => {
  let url: string | undefined;
  if (typeof window !== 'undefined') {
    // oxlint-disable no-unsafe-assignment, no-unsafe-member-access: The window is not typed here
    url = dedicatedUrl ?? window.location.origin;
  }
  if (!url) {
    try {
      url = resources?.[resource]?.url?.includes?.('dev.mode')
        ? localUrl
        : resources?.[resource]?.url;
    } catch {
      // Do nothing
    }
  }

  return url;
};

/**
 * Resolve the API URL. Unlike web apps, the API URL is always known via an env var
 * (set by SST at build time) or the SST resource — never from window.location.origin.
 */
const resolveApiUrl = () => {
  try {
    return process.env.NEXT_PUBLIC_API_URL ?? resources?.api?.url ?? '';
  } catch {
    return '';
  }
};

/** The URL of our web app */
export const appUrl = resolveWebAppUrl({
  resource: 'web',
  localUrl: 'http://localhost:3000',
  // Admin is provided this specifically so that it knows where the web app lives
  dedicatedUrl: process.env.NEXT_PUBLIC_WEB_URL,
});

/** The URL of our admin dashboard */
export const adminUrl = resolveWebAppUrl({ resource: 'admin', localUrl: 'http://localhost:3001' });

/** The URL of our API */
export const apiUrl = resolveApiUrl();
