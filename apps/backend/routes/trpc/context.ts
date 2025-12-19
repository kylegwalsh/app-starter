import type { Organization } from '@prisma/client';
import { addLogMetadata, log } from '@repo/logs';

import { type AuthUser, auth } from '@/core';
import { db } from '@/db';

/** The context type for our tRPC calls */
export type Context = {
  user?: AuthUser;
  organization?: Organization;
};

/**
 * Creates context for an incoming request to be shared across all tRPC calls
 */
export const createContext = async (opts: {
  req: Request;
}): Promise<Context> => {
  // Grab auth cookie from request headers
  const cookies = opts.req.headers.get('cookie') ?? '';

  // If we have a better auth cookie, we will attempt to populate the user context
  let user: AuthUser | undefined;
  let organization: Organization | undefined;
  try {
    if (cookies.includes('better-auth')) {
      const sessionData = await auth.api.getSession({
        headers: {
          cookie: cookies,
        },
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

  // Return context
  return { user, organization };
};
