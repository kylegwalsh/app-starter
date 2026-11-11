import type { Organization } from '@prisma/client';
import { addLogMetadata, log } from '@repo/logs';
import { createMiddleware } from 'hono/factory';

import { UnauthorizedError } from '@/api/error';
import { db } from '@/db';
import { type AuthContext, type AuthUser, auth } from '@/services';

/** Context for every route. user and organization are undefined when signed out */
export type PublicEnv = {
  Variables: Partial<AuthContext>;
};

/** Context for routes behind requireAuth (where user and organization are always set) */
export type ProtectedEnv = {
  Variables: AuthContext;
};

/** Loads the signed-in user and organization onto the context */
export const authMiddleware = createMiddleware<PublicEnv>(async (c, next) => {
  let user: AuthUser | undefined;
  let organization: Organization | undefined;
  const cookies = c.req.header('cookie') ?? '';

  try {
    // Skip the session lookup entirely when there's no Better Auth cookie
    if (cookies.includes('better-auth')) {
      const sessionData = await auth.api.getSession({
        headers: new Headers(c.req.raw.headers),
      });
      user = sessionData?.user;

      // Only keep the active organization if the user is still a member of it
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
    // A failed lookup leaves the request signed out, and requireAuth rejects it where needed
    log.warn({ err: error }, 'Failed to get session');
  }

  // Tag this request's logs with the user and organization
  addLogMetadata({
    userId: user?.id,
    organizationId: organization?.id,
  });

  c.set('user', user);
  c.set('organization', organization);

  await next();
});

/** Throws UnauthorizedError unless a user and organization are present */
export const requireAuth = createMiddleware<ProtectedEnv>(async (c, next) => {
  if (!(c.get('user') && c.get('organization'))) {
    throw new UnauthorizedError();
  }

  await next();
});
