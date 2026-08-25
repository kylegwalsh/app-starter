import type { Organization } from '@prisma/client';
import { ai } from '@repo/ai';
import { addLogMetadata, log } from '@repo/logs';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import { type AuthUser, auth } from '@/core';
import { db } from '@/db';

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
  Variables: {
    user: AuthUser;
    organization: Organization;
  };
};

/**
 * Populates the auth context for every request and updates the AI trace with the
 * response once the handler completes. Applied once at the root of the API.
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

  // Update the AI trace with the output of our request (don't fail the request if
  // this fails). Only buffered JSON responses can be read back here — streaming
  // responses are left alone so we never drain the body the client is waiting on.
  try {
    const isJson = c.res.headers.get('content-type')?.includes('application/json');
    const output = isJson ? await c.res.clone().json() : c.res.status;
    ai.updateRequestTrace({ output });
  } catch (error) {
    log.error({ err: error }, 'Error updating AI trace');
  }
});

/**
 * Rejects requests without a signed-in user and active organization. Protected
 * routers apply this before their routes so {@link ProtectedEnv} holds.
 */
export const requireAuth = createMiddleware<ProtectedEnv>(async (c, next) => {
  if (!(c.get('user') && c.get('organization'))) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  await next();
});
