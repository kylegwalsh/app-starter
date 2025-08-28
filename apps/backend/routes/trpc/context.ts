import { Organization } from '@prisma/client';
import { addLogMetadata } from '@repo/logs';
import { log } from '@repo/logs';
import { CreateAWSLambdaContextOptions } from '@trpc/server/adapters/aws-lambda';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

import { auth, AuthUser } from '@/core';
import { db } from '@/db';

/** The context type for our tRPC calls */
export type Context = {
  user?: AuthUser;
  organization?: Organization;
};

/**
 * Creates context for an incoming request to be shared across all tRPC calls
 * @link https://trpc.io/docs/context
 */
export const createContext = async ({
  event,
}: CreateAWSLambdaContextOptions<APIGatewayProxyEventV2>): Promise<Context> => {
  // Grab auth cookie
  const cookies = event.cookies?.join('; ') ?? '';

  // If we have a better auth cookie, we will attempt to populate the user context
  let user: AuthUser | undefined;
  let organization: Organization | undefined;
  try {
    if (cookies.includes('better-auth')) {
      const sessionData = await auth.api.getSession({
        // It needs the cookie header to get the session, but lambda removes it
        // so we need to re-add it manually here
        headers: {
          // @ts-expect-error - it thinks cookie is not a valid header
          cookie: event.cookies?.join('; ') ?? '',
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
