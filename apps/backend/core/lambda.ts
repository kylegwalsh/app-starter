import { analytics } from '@repo/analytics';
import { addLambdaRequestContext, flushLogs } from '@repo/logs';
import { APIGatewayProxyEventV2, Context, SQSEvent } from 'aws-lambda';

/** The lambda event options we accept */
export type EventType = 'sqs' | 'api' | undefined;

/** The actual payload type of the event */
export type HandlerEvent<T extends EventType> = T extends 'sqs' ? SQSEvent : APIGatewayProxyEventV2;

/** Type for a Lambda handler function */
export type LambdaHandler<T extends EventType> = (
  event: HandlerEvent<T>,
  context: Context
) => unknown;

/**
 * Wraps a Lambda handler to add all of our setup logic
 * @param handler The Lambda handler to wrap
 * @returns A wrapped handler that includes all of our necessary setup
 */
export const withLambdaContext = <T extends EventType = undefined>(
  handler: LambdaHandler<T>
): LambdaHandler<T> => {
  return async (event, context) => {
    // Add Lambda request context for logging
    addLambdaRequestContext(event, context);

    try {
      // Execute the handler
      const result = await handler(event, context);
      // Wait for logs/analytics to be flushed
      await Promise.all([analytics.flush(), flushLogs()]);
      // Return the result
      return result;
    } catch (error) {
      // Wait for logs to be flushed
      await flushLogs();
      // Re-throw the error
      throw error;
    }
  };
};
