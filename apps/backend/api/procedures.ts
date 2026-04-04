import { ORPCError } from '@orpc/server';
import type { Organization } from '@prisma/client';
import { ai } from '@repo/ai';
import { addLogMetadata, log } from '@repo/logs';

import { type AuthUser, auth, orpc } from '@/core';
import { db } from '@/db';

import { handleError } from './error';

/** Our base procedure used by all endpoints (populates auth context and updates AI traces) */
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

        // If the user has an active organization, we will populate the organization context
        const activeOrganizationId = sessionData?.session?.activeOrganizationId;
        if (activeOrganizationId) {
          organization =
            (await db.organization.findUnique({
              where: { id: activeOrganizationId },
            })) ?? undefined;
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

    // Wait for our endpoint to complete before we perform some post-processing
    const result = await next({ context: { user, organization } });

    // Update the AI trace with the output of our request (don't fail the request if this fails)
    try {
      ai.updateRequestTrace({
        output: result.output,
      });
    } catch (error) {
      log.error({ error }, 'Error updating AI trace');
    }

    return result;
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
