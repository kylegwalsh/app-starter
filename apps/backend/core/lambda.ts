import { ai } from '@repo/ai';
import { analytics } from '@repo/analytics';
import { addLambdaRequestContext, addLogMetadata, flushLogs, log } from '@repo/logs';
import type { Context, SQSEvent } from 'aws-lambda';
import type { LambdaEvent } from 'hono/aws-lambda';

/** The lambda event options we accept */
export type EventType = 'sqs' | 'api' | undefined;

/** The actual payload type of the event */
export type HandlerEvent<T extends EventType> = T extends 'sqs' ? SQSEvent : LambdaEvent;

/** Arbitrary Lambda handler shape — buffered or streaming, two- or three-arg. */
type AnyLambdaHandler = (...args: never[]) => unknown;

/** Flush all async observability tools */
const flushObservability = async () => {
  try {
    await Promise.all([analytics.flush(), ai.flush(), flushLogs()]);
  } catch (error) {
    log.error({ err: error }, 'Error flushing observability');
  }
};

/** Pull `{ path, method }` out of either a v1 (REST) or v2 (HTTP) API Gateway event. */
const extractHttpRequestInfo = (event: unknown): { path: string; method: string } | undefined => {
  if (typeof event !== 'object' || event === null || !('requestContext' in event)) {
    return undefined;
  }
  const requestContext = (event as { requestContext: unknown }).requestContext;
  if (typeof requestContext !== 'object' || requestContext === null) {
    return undefined;
  }
  // API Gateway v2 (HTTP API) nests path + method inside `http`.
  if ('http' in requestContext) {
    const http = (requestContext as { http: { path: string; method: string } }).http;
    return { path: http.path, method: http.method };
  }
  // API Gateway v1 (REST API) puts httpMethod on the request context and path on the event.
  if ('httpMethod' in requestContext && 'path' in event) {
    const method = (requestContext as { httpMethod: string }).httpMethod;
    const path = (event as { path: string }).path;
    return { path, method };
  }
  return undefined;
};

/**
 * Wraps any Lambda handler with logging context, error capture, and an
 * observability flush after each invocation. Forwards the original handler's
 * signature so streaming and buffered handlers are both supported, and copies
 * the streaming marker symbol so AWS keeps treating streamified handlers as
 * such after wrapping.
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

  // Forward every symbol-keyed property from the inner handler. `streamifyResponse`
  // tags its return value with a marker the runtime checks to enable streaming
  // mode; AWS prod uses `Symbol.for("aws.lambda.runtime.handler.streaming")`,
  // SST's dev runtime uses `Symbol.for("aws.lambda.streaming")`. Copying every
  // symbol keeps us correct in both environments without naming them.
  for (const sym of Object.getOwnPropertySymbols(handler)) {
    type Indexable = Record<symbol, unknown>;
    (wrapped as Indexable)[sym] = (handler as Indexable)[sym];
  }

  return wrapped;
};
