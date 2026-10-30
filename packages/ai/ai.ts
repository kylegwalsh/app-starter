import { getActiveTraceId, propagateAttributes, startActiveObservation } from '@langfuse/tracing';
import { config } from '@repo/config';
import { getLogMetadata } from '@repo/logs';
import { generateText, type OutputInterface, streamText, type ToolSet } from 'ai';

import { langfuse, langfuseSpanProcessor } from './langfuse';
import { defaultModel, models } from './models';
import type {
  GenerateTextOptions,
  Observation,
  ObserveConfig,
  Observed,
  ObservedArgs,
  RuntimeContext,
  StreamTextOptions,
  TraceDetails,
} from './types';

// ---------- TRACING ----------
/** Tags new traces with the current request's details (route, user, organization, request ID) */
const withRequestDetails = <TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  getDetails?: (...args: TArgs) => TraceDetails,
) => {
  return (...args: TArgs): TReturn => {
    if (getActiveTraceId()) {
      return fn(...args);
    }

    const { userId, organizationId, awsRequestId, request } = getLogMetadata();
    const route = request?.path ? `${request.method} ${request.path}` : undefined;
    const { traceName, sessionId } = getDetails?.(...args) ?? {};
    // Langfuse warns about (and drops) undefined metadata, e.g. the request ID when running locally
    const metadata = Object.fromEntries(
      Object.entries({ route, organizationId, awsRequestId }).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    );
    return propagateAttributes({ traceName: traceName ?? route, userId, sessionId, metadata }, () =>
      fn(...args),
    );
  };
};

// ---------- METHODS ----------
/** Export methods related to AI */
export const ai = {
  /** Our available AI models */
  models,
  /** Wraps an AI task as a named Langfuse observation so it can be replayed or turned into evals */
  observe: <TArgs extends ObservedArgs, TOutput>(
    { name, endOnExit = true, sessionId }: ObserveConfig<TArgs>,
    fn: (args: Observed<TArgs>) => Promise<TOutput>,
  ) =>
    withRequestDetails(
      (args: TArgs) =>
        startActiveObservation(
          name,
          async (span) => {
            // Guard against ending twice (e.g. a stream error after the function already threw)
            let ended = false;
            const observation: Observation = {
              traceId: span.traceId,
              end: (result) => {
                if (ended) {
                  return;
                }
                ended = true;
                if ('error' in result) {
                  const { error } = result;
                  span.update({
                    level: 'ERROR',
                    statusMessage: error instanceof Error ? error.message : String(error),
                  });
                } else {
                  span.update({ output: result.output });
                }
                span.end();
              },
            };

            span.update({ input: args.input });
            try {
              const output = await fn({ ...args, observation });
              if (endOnExit) {
                observation.end({ output });
              }
              return output;
            } catch (error) {
              observation.end({ error });
              throw error;
            }
          },
          // We end the observation ourselves so `endOnExit: false` can keep it open
          { endOnExit: false },
        ),
      (args) => ({ traceName: name, sessionId: sessionId?.(args) }),
    ),
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
