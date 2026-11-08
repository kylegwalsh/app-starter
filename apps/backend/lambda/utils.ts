import { ai } from '@repo/ai';
import { analytics } from '@repo/analytics';
import { addLambdaRequestContext, addLogMetadata, flushLogs, log } from '@repo/logs';
import type { Context, SQSEvent } from 'aws-lambda';
import type { LambdaEvent } from 'hono/aws-lambda';

/** The lambda event options we accept */
export type EventType = 'sqs' | 'api' | undefined;

/** The actual payload type of the event */
export type HandlerEvent<T extends EventType> = T extends 'sqs' ? SQSEvent : LambdaEvent;

/** Any Lambda handler shape (buffered or streaming) */
type AnyLambdaHandler = (...args: never[]) => unknown;

/** Flush all async observability tools */
const flushObservability = async () => {
  try {
    await Promise.all([analytics.flush(), ai.flush(), flushLogs()]);
  } catch (error) {
    log.error({ err: error }, 'Error flushing observability');
  }
};

/** Pulls `{ path, method }` from a v1 (REST) or v2 (HTTP) API Gateway event */
const extractHttpRequestInfo = (event: unknown): { path: string; method: string } | undefined => {
  if (typeof event !== 'object' || event === null || !('requestContext' in event)) {
    return undefined;
  }
  const requestContext = (event as { requestContext: unknown }).requestContext;
  if (typeof requestContext !== 'object' || requestContext === null) {
    return undefined;
  }
  // v2 (HTTP API) nests path and method inside `http`
  if ('http' in requestContext) {
    const http = (requestContext as { http: { path: string; method: string } }).http;
    return { path: http.path, method: http.method };
  }
  // v1 (REST API) puts httpMethod on the request context and path on the event
  if ('httpMethod' in requestContext && 'path' in event) {
    const method = (requestContext as { httpMethod: string }).httpMethod;
    const path = (event as { path: string }).path;
    return { path, method };
  }
  return undefined;
};

/**
 * Wraps a Lambda handler with logging context, error capture, and an
 * observability flush after each invocation
 */
export const withLambdaContext = <T extends AnyLambdaHandler>(handler: T): T => {
  const wrapped = (async (...args: Parameters<T>) => {
    const event = args[0] as LambdaEvent | SQSEvent;
    const context = args[1] as Context;

    addLambdaRequestContext(event, context);

    const httpInfo = extractHttpRequestInfo(event);
    if (httpInfo) {
      const headers =
        typeof event === 'object' && event !== null && 'headers' in event
          ? (event as { headers?: Record<string, string | undefined> }).headers
          : undefined;
      addLogMetadata({
        request: httpInfo,
        // Extract PostHog session ID for log → session replay linking
        sessionId: headers?.['x-posthog-session-id'],
      });
    }

    try {
      const result = await handler(...args);
      await flushObservability();
      return result;
    } catch (error) {
      await analytics.captureException(error);
      await flushObservability();
      throw error;
    }
  }) as unknown as T;

  // Copy the handler's properties (including symbols) so streaming handlers stay marked as streaming
  return Object.defineProperties(wrapped, Object.getOwnPropertyDescriptors(handler));
};
