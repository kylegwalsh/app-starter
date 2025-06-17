import type { EventType, LambdaHandler } from '../../apps/backend/core/lambda';
import { addLambdaRequestContext, flushLogs } from './log';

/**
 * Wraps a Lambda handler to add logging context and ensure logs are flushed
 * @param handler The Lambda handler to wrap
 * @returns A wrapped handler that includes logging context and flushing
 */
export const withLogging = <T extends EventType>(handler: LambdaHandler<T>): LambdaHandler<T> => {
  return async (event, context) => {
    // Add Lambda request context for logging
    addLambdaRequestContext(event, context);

    try {
      // Execute the handler
      const result = await handler(event, context);
      // Wait for logs to be flushed
      await flushLogs();
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
