import { addLogMetadata } from '@repo/logs';
import { CreateAWSLambdaContextOptions } from '@trpc/server/adapters/aws-lambda';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

// Define the context type with all properties optional
export type Context = {
  userId?: string;
};

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export const createContext = ({
  event,
}: CreateAWSLambdaContextOptions<APIGatewayProxyEventV2>): Context => {
  const userId = `test-${Date.now()}`;

  // Add the user ID to the log metadata
  addLogMetadata({ userId });

  // Return context
  return { userId };
};
