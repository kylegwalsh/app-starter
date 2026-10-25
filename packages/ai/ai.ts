import type { LanguageModelV4 } from '@ai-sdk/provider';
import {
  getActiveTraceId,
  observe,
  type ObserveOptions,
  propagateAttributes,
} from '@langfuse/tracing';
import { config } from '@repo/config';
import { getLogMetadata } from '@repo/logs';
import { generateText, type OutputInterface, streamText, type ToolSet } from 'ai';

import { langfuse, langfuseSpanProcessor } from './langfuse';
import { defaultModel, models } from './models';

// ---------- TRACING ----------
/**
 * Wraps a function so every observation created inside it carries the current request's details
 * (trace name, route, user and request ID). Calls already inside an observation keep that
 * observation's details instead.
 */
const withRequestDetails = <TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  traceName?: string,
) => {
  return (...args: TArgs): TReturn => {
    if (getActiveTraceId()) {
      return fn(...args);
    }

    const { userId, awsRequestId, request } = getLogMetadata();
    const route = request?.path ? `${request.method} ${request.path}` : undefined;
    return propagateAttributes(
      { traceName: traceName ?? route, userId, metadata: { route, awsRequestId } },
      () => fn(...args),
    );
  };
};

// ---------- TYPES ----------
type RuntimeContext = NonNullable<Parameters<typeof generateText>[0]['runtimeContext']>;

type WithDefaultModel<OPTIONS> = OPTIONS extends unknown
  ? Omit<OPTIONS, 'model'> & {
      /** The model to use for the generation (defaults to our default model) */
      model?: LanguageModelV4;
    }
  : never;

type GenerateTextOptions<TOOLS extends ToolSet, OUTPUT extends OutputInterface> = WithDefaultModel<
  Parameters<typeof generateText<TOOLS, RuntimeContext, OUTPUT>>[0]
>;

type StreamTextOptions<TOOLS extends ToolSet, OUTPUT extends OutputInterface> = WithDefaultModel<
  Parameters<typeof streamText<TOOLS, RuntimeContext, OUTPUT>>[0]
>;

// ---------- METHODS ----------
/** Export methods related to AI */
export const ai = {
  /** Our available AI models */
  models,
  /**
   * Wraps a function as a named Langfuse observation that records its input and output.
   * Use it around each AI task so it can be found, replayed or converted into evals.
   */
  observe: <TArgs extends unknown[], TReturn>(
    name: string,
    fn: (...args: TArgs) => TReturn,
    options?: Omit<ObserveOptions, 'name'>,
  ) => withRequestDetails(observe(fn, { name, ...options }), name),
  /** Gets the ID of the active trace so it can be scored later */
  getTraceId: getActiveTraceId,
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

      default: {
        dataType = 'CATEGORICAL';
        break;
      }
    }

    langfuse?.score.create({
      traceId,
      name,
      value: typeof score === 'boolean' ? Number(score) : score,
      dataType,
      comment,
      environment: config.stage,
    });
  },
  /** Ensure all traces get flushed to Langfuse */
  flush: async () => {
    await Promise.all([langfuse?.flush(), langfuseSpanProcessor?.forceFlush()]);
  },
  /** Generate text (or structured data via `output: Output.object(...)`) using an LLM */
  generateText: withRequestDetails(
    async <
      TOOLS extends ToolSet,
      OUTPUT extends OutputInterface = OutputInterface<string, string>,
    >({
      model = defaultModel,
      ...rest
    }: GenerateTextOptions<TOOLS, OUTPUT>) =>
      await generateText<TOOLS, RuntimeContext, OUTPUT>({ model, maxRetries: 3, ...rest }),
  ),
  /** Stream text (or structured data via `output: Output.object(...)`) using an LLM */
  streamText: withRequestDetails(
    async <
      TOOLS extends ToolSet,
      OUTPUT extends OutputInterface = OutputInterface<string, string>,
    >({
      model = defaultModel,
      ...rest
    }: StreamTextOptions<TOOLS, OUTPUT>) =>
      streamText<TOOLS, RuntimeContext, OUTPUT>({ model, maxRetries: 3, ...rest }),
  ),
};
