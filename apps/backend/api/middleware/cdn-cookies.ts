import { createSign } from 'node:crypto';

import { config, env } from '@repo/config';
import { log } from '@repo/logs';
import type { MiddlewareHandler } from 'hono';

import { getBaseDomain, getCdnDomain } from '@/core/cdn';

/**
 * Middleware that sets CloudFront signed cookies for file access.
 * Scoped to the user's active organization so org members can view shared files.
 * Only active when a custom domain is configured (skipped in local dev).
 * Re-signs cookies when the user switches organizations.
 */
export const cdnCookiesMiddleware: MiddlewareHandler = async (c, next) => {
  await next();

  // Skip in local dev — no CloudFront distribution
  if (!config.hasCustomDomain) {
    return;
  }

  // Only set cookies on successful responses
  if (c.res.status >= 400) {
    return;
  }

  try {
    const keyPairId = (env as Record<string, string>).CLOUDFRONT_KEY_PAIR_ID;
    const privateKey = (env as Record<string, string>).CLOUDFRONT_PRIVATE_KEY;

    if (!keyPairId || !privateKey) {
      return;
    }

    // Get the user's active organization
    const sessionData = await import('@/core').then((m) =>
      m.auth.api.getSession({ headers: c.req.raw.headers }),
    );
    const orgId = sessionData?.session?.activeOrganizationId;
    if (!orgId) {
      return;
    }

    // Check if cookies are already set for the current org (avoid re-signing on every request)
    const existingCookie = c.req.header('cookie') ?? '';
    const existingOrgMatch = existingCookie.match(/CloudFront-Org=([^;]+)/);
    if (existingCookie.includes('CloudFront-Key-Pair-Id') && existingOrgMatch?.[1] === orgId) {
      return; // Cookies are valid for the current org
    }

    // Build the CloudFront cookie policy — scoped to this org's uploads
    const cdnDomain = getCdnDomain();
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24 hours

    const policy = JSON.stringify({
      Statement: [
        {
          Resource: `https://${cdnDomain}/${orgId}/*`,
          Condition: {
            DateLessThan: { 'AWS:EpochTime': expiresAt },
          },
        },
      ],
    });

    // Sign the policy
    const encodedPolicy = Buffer.from(policy).toString('base64url');
    const signer = createSign('RSA-SHA1');
    signer.update(policy);
    const signature = signer.sign(privateKey, 'base64url');

    // Set the CloudFront signed cookies + org tracker
    const baseDomain = getBaseDomain();
    const cookieOpts = `; Domain=.${baseDomain}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=86400`;

    c.header('Set-Cookie', `CloudFront-Policy=${encodedPolicy}${cookieOpts}`, { append: true });
    c.header('Set-Cookie', `CloudFront-Signature=${signature}${cookieOpts}`, { append: true });
    c.header('Set-Cookie', `CloudFront-Key-Pair-Id=${keyPairId}${cookieOpts}`, { append: true });
    // Track which org the cookies are scoped to — used to detect org switches
    c.header('Set-Cookie', `CloudFront-Org=${orgId}${cookieOpts}`, { append: true });
  } catch (error) {
    // Don't fail the request if cookie signing fails
    log.warn({ error }, 'Failed to set CloudFront signed cookies');
  }
};
