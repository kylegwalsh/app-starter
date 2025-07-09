import { analytics } from '@repo/analytics';
import type { TRPCError, TRPCProcedureType } from '@trpc/server';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

import type { createContext } from './context';

/** Handles errors that occur in our API */
export const onError = ({
  error,
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
    /** Extract the underlying error */
    const rootError = error?.cause ?? error;

    // Track the error
    void analytics.captureException(rootError);
  }
};
