import { LangfuseClient } from '@langfuse/client';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { LangfuseVercelAiSdkIntegration } from '@langfuse/vercel-ai-sdk';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { config, env } from '@repo/config';
import { registerTelemetry } from 'ai';

/** Check if Langfuse is enabled */
const langfuseEnabled =
  (env as Record<string, string>).LANGFUSE_SECRET_KEY &&
  (env as Record<string, string>).LANGFUSE_PUBLIC_KEY;

/** Config for Langfuse */
const langfuseConfig: ConstructorParameters<typeof LangfuseClient>[0] = {
  secretKey: (env as Record<string, string>).LANGFUSE_SECRET_KEY,
  publicKey: (env as Record<string, string>).LANGFUSE_PUBLIC_KEY,
  baseUrl: 'https://us.cloud.langfuse.com',
};

/** Langfuse client (only initialized if Langfuse is setup) */
export const langfuse = langfuseEnabled ? new LangfuseClient(langfuseConfig) : undefined;

/** Langfuse telemetry exporter (only initialized if Langfuse is setup) */
export const langfuseSpanProcessor = langfuseEnabled
  ? new LangfuseSpanProcessor({
      ...langfuseConfig,
      environment: config.stage,
      exportMode: 'immediate',
    })
  : undefined;

// Register our tracing so all AI SDK calls are exported to Langfuse
if (langfuseSpanProcessor) {
  const tracerProvider = new NodeTracerProvider({
    spanProcessors: [langfuseSpanProcessor],
  });
  tracerProvider.register();

  // Trace all AI SDK calls as Langfuse observations (exported by the Langfuse span processor)
  registerTelemetry(new LangfuseVercelAiSdkIntegration());
}
