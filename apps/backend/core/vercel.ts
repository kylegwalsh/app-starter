import { ai } from '@repo/ai';
import { analytics } from '@repo/analytics';
import { flushLogs, log, withLoggingContext } from '@repo/logs';
import { nanoid } from 'nanoid';

/** Flush all async observability tools */
const flushObservability = async () => {
  try {
    await Promise.all([analytics.flush(), ai.flush(), flushLogs()]);
  } catch (error) {
    log.error({ error }, 'Error flushing observability');
  }
};

/** Wraps a Vercel handler to add all of our setup logic */
export const withVercelContext = (
  handler: (request: Request) => Response | Promise<Response>
): ((request: Request) => Promise<Response>) => {
  // biome-ignore lint/suspicious/useAwait: We need async to ensure consistent return type
  return async (request: Request) => {
    // Extract request metadata
    const requestId = nanoid();
    const requestUrl = new URL(request.url);
    const metadata = {
      requestId,
      request: { path: requestUrl.pathname, method: request.method },
    };

    // Run handler within logging context
    return withLoggingContext(metadata, async () => {
      log.info('Request started');

      try {
        // Execute the handler
        const result = await handler(request);
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
    });
  };
};
