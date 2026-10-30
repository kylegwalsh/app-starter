import type { Organization } from '@prisma/client';
import { addLogMetadata, log } from '@repo/logs';
import { createMiddleware } from 'hono/factory';

import { UnauthorizedError } from '@/api/error';
import { db } from '@/db';
import { type AuthContext, type AuthUser, auth } from '@/services';

/** Context populated by {@link authMiddleware} — user/organization may be absent */
export type PublicEnv = {
  Variables: {
    user: AuthUser | undefined;
    organization: Organization | undefined;
  };
};

/**
 * Context guaranteed by {@link requireAuth}. Protected routers declare this env
 * so handlers read `c.get('user')` without null checks.
 */
export type ProtectedEnv = {
  Variables: AuthContext;
};

/**
 * Populates the auth context for every request. Applied once at the root of the API.
 */
export const authMiddleware = createMiddleware<PublicEnv>(async (c, next) => {
  let user: AuthUser | undefined;
  let organization: Organization | undefined;
  const cookies = c.req.header('cookie') ?? '';

  try {
    // If we have a better auth cookie, we will attempt to populate the user and organization contexts
    if (cookies.includes('better-auth')) {
      const sessionData = await auth.api.getSession({
        headers: new Headers(c.req.raw.headers),
      });
      user = sessionData?.user;

      // If the user has an active organization, verify they're still a member
      const activeOrganizationId = sessionData?.session?.activeOrganizationId;
      if (activeOrganizationId && user) {
        const membership = await db.member.findFirst({
          where: { userId: user.id, organizationId: activeOrganizationId },
          include: { organization: true },
        });
        organization = membership?.organization ?? undefined;
      }
    }
  } catch (error) {
    log.warn({ err: error }, 'Failed to get session');
  }

  // Add some metadata to our logs
  addLogMetadata({
    userId: user?.id,
    organizationId: organization?.id,
  });

  c.set('user', user);
  c.set('organization', organization);

  await next();
});

/**
 * Rejects requests without a signed-in user and active organization. Protected
 * routers apply this before their routes so {@link ProtectedEnv} holds.
 */
export const requireAuth = createMiddleware<ProtectedEnv>(async (c, next) => {
  if (!(c.get('user') && c.get('organization'))) {
    throw new UnauthorizedError();
  }

  await next();
});
