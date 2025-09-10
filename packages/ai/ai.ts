import { randomUUID } from 'node:crypto';

import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
// import { createAnthropic } from '@ai-sdk/anthropic';
// import { createGoogleGenerativeAI } from '@ai-sdk/google';
// import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModelV2 } from '@ai-sdk/provider';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { config, env } from '@repo/config';
import { addLogMetadata, getLogMetadata } from '@repo/logs';
import { generateObject, GenerateObjectResult, generateText } from 'ai';
import { Langfuse } from 'langfuse';
import { z } from 'zod';

// ---------- LANGFUSE ----------
/** Langfuse client */
let langfuse: Langfuse | undefined;
/** Langfuse telemetry exporter */
let langfuseSpanProcessor: LangfuseSpanProcessor | undefined;
// Only initialize Langfuse if it's setup
if (
  (env as Record<string, string>).LANGFUSE_SECRET_KEY &&
  (env as Record<string, string>).LANGFUSE_PUBLIC_KEY
) {
  /** Config for Langfuse */
  const langfuseConfig: ConstructorParameters<typeof Langfuse>[0] = {
    environment: config.stage,
    secretKey: (env as Record<string, string>).LANGFUSE_SECRET_KEY,
    publicKey: (env as Record<string, string>).LANGFUSE_PUBLIC_KEY,
    baseUrl: 'https://us.cloud.langfuse.com',
  };

  // Initialize everything needed for Langfuse
  langfuse = new Langfuse(langfuseConfig);
  langfuseSpanProcessor = new LangfuseSpanProcessor({
    ...langfuseConfig,
    exportMode: 'immediate',
  });
  const openTelemetry = new NodeSDK({
    spanProcessors: [langfuseSpanProcessor],
  });
  openTelemetry.start();
}

/** Get the telemetry config for a given method */
const getTelemetryConfig = ({ name, parentTraceId }: { name?: string; parentTraceId?: string }) => {
  const { langfuseTraceId, userId, awsRequestId, request } = getLogMetadata();

  // If we haven't created a parent trace yet, create one
  let traceId = parentTraceId ?? langfuseTraceId;
  if (!traceId) {
    traceId = ai.createTrace({
      name: request?.path ? `${request?.method} ${request?.path}` : 'Unknown',
      userId,
      awsRequestId,
    }) as string;
    addLogMetadata({ langfuseTraceId: traceId });
  }

  return {
    isEnabled: true,
    functionId: name,
    // Attach each run to our overall route trace
    metadata: {
      langfuseTraceId: traceId,
      langfuseUpdateParent: false, // Do not update the parent trace with execution results
    },
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
    'claude-3-5-haiku': bedrock('us.anthropic.claude-3-5-haiku-20241022-v1:0'),
    'claude-4-sonnet': bedrock('us.anthropic.claude-sonnet-4-20250514-v1:0'),
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
> & {
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
  /** Generate a new parent trace */
  createTrace: ({
    name,
    userId,
    awsRequestId,
  }: {
    name: string;
    userId?: string;
    awsRequestId?: string;
  }) => {
    const traceId = randomUUID();
    langfuse?.trace({
      id: traceId,
      name,
      userId,
      metadata: {
        awsRequestId,
      },
    });

    return traceId;
  },
  /** Gets the ID of the current trace */
  getTraceId: () => {
    const { langfuseTraceId } = getLogMetadata();
    return langfuseTraceId;
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
    let dataType: Parameters<NonNullable<typeof langfuse>['score']>[0]['dataType'];
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

    langfuse?.score({
      traceId,
      name,
      value: typeof score === 'boolean' ? (score ? 1 : 0) : score,
      dataType: dataType,
      comment,
    });
  },
  /** Ensure all traces get flushed to Langfuse */
  flush: async () => {
    await Promise.all([langfuse?.flushAsync(), langfuseSpanProcessor?.forceFlush()]);
  },
  /** Generate text using an LLM */
  generateText: async ({
    model = models.bedrock['claude-3-5-haiku'],
    name,
    parentTraceId,
    ...rest
  }: Omit<Parameters<typeof generateText>[0], 'model'> & {
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
      // Enable telemetry for the Langfuse SDK
      experimental_telemetry: getTelemetryConfig({ name, parentTraceId }),
    });
  },
  /** Generate an object using an LLM */
  generateObject: async <SCHEMA extends z.ZodType<any, any, any>>({
    model = models.bedrock['claude-3-5-haiku'],
    name,
    parentTraceId,
    ...rest
  }: GenerateObjectWithTelemetryInput<SCHEMA>): Promise<GenerateObjectResult<z.infer<SCHEMA>>> => {
    return await generateObject({
      model,
      maxRetries: 3,
      ...rest,
      // Enable telemetry for the Langfuse SDK
      experimental_telemetry: getTelemetryConfig({ name, parentTraceId }),
    });
  },
};
