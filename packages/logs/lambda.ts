import type { EventType, LambdaHandler } from '../../apps/backend/core/lambda';
import { addLambdaRequestContext } from './log';

/**
 * Wraps a Lambda handler to add logging context and ensure logs are flushed
 * @param handler The Lambda handler to wrap
 * @returns A wrapped handler that includes logging context and flushing
 */
export const withLogging = <T extends EventType>(handler: LambdaHandler<T>): LambdaHandler<T> => {
  return async (event, context) => {
    // Add Lambda request context for logging
    addLambdaRequestContext(event, context);

    // Execute the handler
    return await handler(event, context);
  };
};
