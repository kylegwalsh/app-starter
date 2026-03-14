import type { Organization } from '@prisma/client';
import { addLogMetadata, log } from '@repo/logs';

import { type AuthUser, auth } from '@/core';
import { db } from '@/db';

import { base } from './base';

/** Middleware that populates user and organization context from auth cookies */
export const withAuth = base.middleware(async ({ context, next }) => {
  const cookies = context.headers.get('cookie') ?? '';

  // If we have a better auth cookie, we will attempt to populate the user context
  let user: AuthUser | undefined;
  let organization: Organization | undefined;
  try {
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

  return next({ context: { user, organization } });
});
