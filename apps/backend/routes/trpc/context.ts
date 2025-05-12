import { CreateAWSLambdaContextOptions } from "@trpc/server/adapters/aws-lambda";
import { APIGatewayProxyEventV2 } from "aws-lambda";

// Define the context type with all properties optional
export type Context = {
  userId?: string;
};

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export const createContext = async ({
  event,
}: CreateAWSLambdaContextOptions<APIGatewayProxyEventV2>): Promise<Context> => {
  console.log("Event: ", event);

  // Return context
  return {};
};
