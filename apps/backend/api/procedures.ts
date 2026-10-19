import { ORPCError } from '@orpc/server';
import type { Organization } from '@prisma/client';
import { addLogMetadata, log } from '@repo/logs';

import { type AuthUser, auth, orpc } from '@/core';
import { db } from '@/db';

import { handleError } from './error';

/** Our base procedure used by all endpoints (populates auth context) */
const baseProcedure = orpc.use(async ({ context, next }) => {
  try {
    let user: AuthUser | undefined;
    let organization: Organization | undefined;
    const cookies = context.headers.get('cookie') ?? '';

    try {
      // If we have a better auth cookie, we will attempt to populate the user and organization contexts
      if (cookies.includes('better-auth')) {
        const sessionData = await auth.api.getSession({
          headers: context.headers,
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
      log.warn({ error }, 'Failed to get session');
    }

    // Add some metadata to our logs
    addLogMetadata({
      userId: user?.id,
      organizationId: organization?.id,
    });

    return await next({ context: { user, organization } });
  } catch (error) {
    // Handle and report any errors
    await handleError({ error });
    throw error;
  }
});

/** Procedure that doesn't require the user to be logged in */
export const publicProcedure = baseProcedure;

/** Procedure that requires the user to be logged in */
export const protectedProcedure = baseProcedure.use(({ context, next }) => {
  // If the user is not logged in, we will throw an error
  if (!(context.user && context.organization)) {
    throw new ORPCError('UNAUTHORIZED');
  }

  // If the user is logged in, we will pass the context to the next endpoint
  return next({
    context: {
      user: context.user,
      organization: context.organization,
    },
  });
});
