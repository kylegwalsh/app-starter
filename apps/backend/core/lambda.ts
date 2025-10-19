import { ai } from '@repo/ai';
import { analytics } from '@repo/analytics';
import { addLambdaRequestContext, addLogMetadata, flushLogs, log } from '@repo/logs';
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

/** Flush all async observability tools */
const flushObservability = async () => {
  try {
    await Promise.all([analytics.flush(), ai.flush(), flushLogs()]);
  } catch (error) {
    log.error({ error }, 'Error flushing observability');
  }
};

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
    if ('requestContext' in event) {
      const { path, method } = event.requestContext.http;
      addLogMetadata({
        request: { path, method },
      });
    }

    try {
      // Execute the handler
      const result = await handler(event, context);
      // Wait for all async observability tools to be flushed
      await flushObservability();
      // Return the result
      return result;
    } catch (error) {
      // Report the error
      await analytics.captureException(error);
      // Wait for all async observability tools to be flushed
      await flushObservability();
      // Re-throw the error
      throw error;
    }
  };
};
