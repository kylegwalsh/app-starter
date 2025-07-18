import { addLogMetadata } from '@repo/logs';
import { log } from '@repo/logs';
import { CreateAWSLambdaContextOptions } from '@trpc/server/adapters/aws-lambda';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

import { auth, AuthUser } from '@/core';

/** The context type for our tRPC calls */
export type Context = {
  user?: AuthUser;
};

/**
 * Creates context for an incoming request to be shared across all tRPC calls
 * @link https://trpc.io/docs/context
 */
export const createContext = async ({
  event,
}: CreateAWSLambdaContextOptions<APIGatewayProxyEventV2>): Promise<Context> => {
  // Extract request details
  const { path, method } = event.requestContext.http;
  const cookies = event.cookies?.join('; ') ?? '';

  // If we have a better auth cookie, we will attempt to populate the user context
  let user: AuthUser | undefined;
  try {
    if (cookies.includes('better-auth')) {
      const session = await auth.api.getSession({
        // It needs the cookie header to get the session, but lambda removes it
        // so we need to re-add it manually here
        headers: {
          // @ts-expect-error - it thinks cookie is not a valid header
          cookie: event.cookies?.join('; ') ?? '',
        },
      });
      user = session?.user;
    }
  } catch (error) {
    log.warn({ error }, 'Failed to get session');
  }

  // Add some metadata to our logs
  addLogMetadata({
    userId: user?.id,
    request: { path, method },
  });

  // Return context
  return { user };
};
