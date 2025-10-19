/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
// import { createAnthropic } from '@ai-sdk/anthropic';
// import { createGoogleGenerativeAI } from '@ai-sdk/google';
// import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModelV2 } from '@ai-sdk/provider';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { LangfuseClient } from '@langfuse/client';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import {
  createTraceId,
  getActiveSpanId,
  getActiveTraceId,
  startActiveObservation,
  updateActiveTrace,
} from '@langfuse/tracing';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { config, env } from '@repo/config';
import { addLogMetadata, getLogMetadata } from '@repo/logs';
import { generateObject, type GenerateObjectResult, generateText, type Prompt } from 'ai';
import { z } from 'zod';

// ---------- LANGFUSE ----------
/** Langfuse client */
let langfuse: LangfuseClient | undefined;
/** Langfuse telemetry exporter */
let langfuseSpanProcessor: LangfuseSpanProcessor | undefined;
// Only initialize Langfuse if it's setup
if (
  (env as Record<string, string>).LANGFUSE_SECRET_KEY &&
  (env as Record<string, string>).LANGFUSE_PUBLIC_KEY
) {
  /** Config for Langfuse */
  const langfuseConfig: ConstructorParameters<typeof LangfuseClient>[0] = {
    secretKey: (env as Record<string, string>).LANGFUSE_SECRET_KEY,
    publicKey: (env as Record<string, string>).LANGFUSE_PUBLIC_KEY,
    baseUrl: 'https://us.cloud.langfuse.com',
  };

  // Initialize everything needed for Langfuse
  langfuse = new LangfuseClient(langfuseConfig);
  langfuseSpanProcessor = new LangfuseSpanProcessor({
    ...langfuseConfig,
    environment: config.stage,
    exportMode: 'immediate',
  });
  const tracerProvider = new NodeTracerProvider({
    spanProcessors: [langfuseSpanProcessor],
  });
  tracerProvider.register();
}

/** Automatically trace a generation in Langfuse by wrapping the generation function */
const traceGeneration = <TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>
): ((...args: TArgs) => Promise<TReturn>) => {
  return async (...args: TArgs): Promise<TReturn> => {
    // Get our log data (indicates if we have a top-level request trace)
    const { langfuseTraceId, userId, awsRequestId, request } = getLogMetadata();
    // See if we have an active trace wrapping this invocation (indicates we're inside another observation)
    const activeTraceId = getActiveTraceId();
    const activeSpanId = getActiveSpanId();
    // See if our current observation has any specific settings
    const observationName = (args[0] as { name?: string })?.name ?? 'generation';
    const parentTraceId = (args[0] as { parentTraceId?: string })?.parentTraceId;

    // Our active trace will be one of the following (in order):
    // 1. Manually provided as a parent trace id (parentTraceId)
    // 2. Inferred from a wrapping observation (activeTraceId)
    // 3. Default to a route-level trace (langfuseTraceId)
    let traceId = parentTraceId ?? activeTraceId ?? langfuseTraceId;
    // If we haven't created a parent trace yet, we'll create one and make note of it
    let createdTrace = false;
    if (!traceId) {
      traceId = await createTraceId(awsRequestId);
      createdTrace = true;
    }

    // Observe our generation
    const result = await startActiveObservation(
      observationName,
      async () => {
        // If we are creating a fresh trace, we need to set the metadata for the top-level trace
        if (createdTrace) {
          // This top level trace will refer to the entire request (so we'll include the method and path)
          const topLevelObservationName = request?.path
            ? `${request?.method} ${request?.path}`
            : observationName;

          // Set the metadata for our top-level trace
          updateActiveTrace({
            name: topLevelObservationName,
            userId,
            metadata: {
              awsRequestId,
            },
          });

          // Ensure the trace id is added to the log metadata so we can re-use it and log it
          addLogMetadata({ langfuseTraceId: traceId });
        }

        // Invoke our actual AI method
        return await fn(...args);
      },
      // Ensure all observations are attached to the same trace (unless overridden)
      {
        parentSpanContext: {
          traceId,
          spanId: activeSpanId ?? '0123456789abcdef',
          traceFlags: 1,
        },
      }
    );

    return result;
  };
};

// ---------- MODELS ----------
const bedrock = createAmazonBedrock({
  // We can inherit our AWS function permissions using this method
  credentialProvider: fromNodeProviderChain(),
  region: 'us-east-1',
});
// const anthropic = createAnthropic({
//   apiKey: env.ANTHROPIC_API_KEY,
// });
// const openai = createOpenAI({
//   apiKey: env.OPENAI_API_KEY,
// });
// const google = createGoogleGenerativeAI({
//   apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
// });

/** Our available AI models */
export const models = {
  bedrock: {
    'claude-4-5-haiku': bedrock('us.anthropic.claude-3-5-haiku-20241022-v1:0'),
    'claude-4-5-sonnet': bedrock('us.anthropic.claude-sonnet-4-5-20250929-v1:0'),
  },
  // anthropic: {
  //   'claude-3-5-haiku': anthropic('claude-3-5-haiku-20241022'),
  //   'claude-4-sonnet': anthropic('claude-4-sonnet-20250514'),
  // },
  // openai: {
  //   'gpt-4.1': openai('gpt-4.1'),
  //   'gpt-4.1-mini': openai('gpt-4.1-mini'),
  //   'o3': openai('o3'),
  //   'o3-mini': openai('o3-mini'),
  // },
  // google: {
  //   'gemini-2.0-flash': google('gemini-2.0-flash'),
  //   'gemini-2.5-flash': google('gemini-2.5-flash'),
  // },
};

// ---------- METHODS ----------
/** It's pretty painful to match and extend the type of the generateObject method, but this gets close */
type GenerateObjectWithTelemetryInput<SCHEMA extends z.ZodType<any, any, any>> = Omit<
  Parameters<typeof generateObject<SCHEMA>>[0],
  'experimental_telemetry' | 'model'
> &
  Prompt & {
    /** The schema to use for the generation */
    schema: SCHEMA;
    /** The model to use for the generation */
    model?: LanguageModelV2;
    /** The name of the method to show in Langfuse */
    name?: string;
    /** The parent trace ID to attach this generation to in Langfuse (defaults to trace for entire route) */
    parentTraceId?: string;
  };

/** Export methods related to AI */
export const ai = {
  /** Our available AI models */
  models,
  /** Start a new active observation (can wrap other observations in Langfuse) */
  startActiveObservation,
  /** Gets the ID of the current trace */
  getRequestTraceId: () => {
    const { langfuseTraceId } = getLogMetadata();
    return langfuseTraceId;
  },
  /** Update our top-level request's trace metadata */
  updateRequestTrace: (update: Parameters<typeof updateActiveTrace>[0]) => {
    const { langfuseTraceId } = getLogMetadata();
    if (!langfuseTraceId) return;

    startActiveObservation(
      'Update Metadata',
      () => {
        updateActiveTrace(update);
      },
      {
        parentSpanContext: {
          traceId: langfuseTraceId,
          spanId: '0123456789abcdef',
          traceFlags: 1,
        },
      }
    );
  },
  /** Scores a trace */
  scoreTrace: ({
    traceId,
    name = 'feedback',
    score,
    comment,
  }: {
    /** The trace ID to score */
    traceId: string;
    /** The name of the score (defaults to 'feedback') */
    name?: string;
    /** The score to give the trace */
    score: number | boolean | string;
    /** A comment to add to the score */
    comment?: string;
  }) => {
    // Determine the data type based on the score type
    let dataType: Parameters<NonNullable<typeof langfuse>['score']['create']>[0]['dataType'];
    switch (typeof score) {
      case 'boolean': {
        dataType = 'BOOLEAN';
        break;
      }
      case 'number': {
        dataType = 'NUMERIC';
        break;
      }
      case 'string': {
        dataType = 'CATEGORICAL';
        break;
      }
    }

    langfuse?.score.create({
      traceId,
      name,
      value: typeof score === 'boolean' ? (score ? 1 : 0) : score,
      dataType: dataType,
      comment,
    });
  },
  /** Ensure all traces get flushed to Langfuse */
  flush: async () => {
    await Promise.all([langfuse?.flush(), langfuseSpanProcessor?.forceFlush()]);
  },
  /** Generate text using an LLM */
  generateText: traceGeneration(
    async ({
      model = models.bedrock['claude-4-5-haiku'],
      name,
      parentTraceId,
      ...rest
    }: Omit<Parameters<typeof generateText>[0], 'model'> &
      Prompt & {
        /** The model to use for the generation */
        model?: LanguageModelV2;
        /** The name of the method to show in Langfuse */
        name?: string;
        /** The parent trace ID to attach this generation to in Langfuse (defaults to trace for entire route) */
        parentTraceId?: string;
      }) => {
      return await generateText({
        model,
        maxRetries: 3,
        ...rest,
        experimental_telemetry: { isEnabled: true },
      } satisfies Parameters<typeof generateText>[0]);
    }
  ),
  /** Generate an object using an LLM */
  generateObject: traceGeneration(
    async <SCHEMA extends z.ZodType<any, any, any>>({
      model = models.bedrock['claude-4-5-haiku'],
      name,
      parentTraceId,
      ...rest
    }: GenerateObjectWithTelemetryInput<SCHEMA>): Promise<
      GenerateObjectResult<z.infer<SCHEMA>>
    > => {
      return await generateObject({
        model,
        maxRetries: 3,
        ...rest,
        experimental_telemetry: { isEnabled: true },
      });
    }
  ),
};
