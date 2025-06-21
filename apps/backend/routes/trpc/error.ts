import { analytics } from '@repo/analytics';
import type { TRPCError, TRPCProcedureType } from '@trpc/server';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

import type { createContext } from './context';

/** Handles errors that occur in our API */
export const onError = ({
  error,
  ctx,
  ...other
}: {
  error: TRPCError;
  ctx?: Awaited<ReturnType<typeof createContext>>;
  req: APIGatewayProxyEventV2;
  type: TRPCProcedureType | 'unknown';
  path: string | undefined;
  input: unknown;
}) => {
  // Ignore UNAUTHORIZED errors (not very important and can occur in a few scenarios)
  if (error.code !== 'UNAUTHORIZED') {
    /** Extract some other useful properties to report on */
    const properties = {
      path: other?.path,
      type: other?.type,
      referer: other?.req?.headers?.referer,
      requestId: other?.req?.requestContext?.requestId,
      input: other?.input,
    };

    /** Extract the underlying error */
    const rootError = error?.cause ?? error;

    // Track the error
    void analytics.captureException(rootError, { userId: ctx?.userId, ...properties });
  }
};
