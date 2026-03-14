import { analytics } from '@repo/analytics';

/** Error interceptor for the oRPC handler */
export const errorInterceptor = async (error: unknown, { next }: { next: () => unknown }) => {
  try {
    return await next();
  } catch (error: unknown) {
    // Ignore UNAUTHORIZED errors (not very important and can occur in a few scenarios)
    const code = (error as { code?: string })?.code;
    if (code !== 'UNAUTHORIZED') {
      const rootError = (error as { cause?: unknown })?.cause ?? error;
      analytics.captureException(rootError);
    }
    throw error;
  }
};
