import type { LanguageModelV4 } from '@ai-sdk/provider';
import type { generateText, OutputInterface, streamText, ToolSet } from 'ai';

// ---------- TRACING ----------
/** Trace-level details a call can set when it starts a new trace */
export type TraceDetails = {
  /** The name of the trace (defaults to the request's route) */
  traceName?: string;
  /** Groups related traces into a Langfuse session (e.g. the turns of a chat conversation) */
  sessionId?: string;
};

/** Handle an observed function receives so it can end its own observation (see `endOnExit`) */
export type Observation = {
  /** The ID of the trace this observation belongs to (store it to score the trace later) */
  traceId: string;
  /** Ends the observation, recording either its output or the error that ended it */
  end: (result: { output?: unknown } | { error: unknown }) => void;
};

/** What an observed function is called with */
export type ObservedArgs = {
  /** Everything needed to replay the task (stored in Langfuse) */
  input: unknown;
  /** Runtime dependencies that shouldn't be recorded (e.g. the signed-in user) */
  context?: unknown;
};

/** An observed function's parameter: its args plus the handle to end the observation */
export type Observed<TArgs extends ObservedArgs> = TArgs & { observation: Observation };

/** Configuration for an observed AI task (see `ai.observe`) */
export type ObserveConfig<TArgs extends ObservedArgs> = {
  /** The observation's name in Langfuse (also the trace name when it starts a new trace) */
  name: string;
  /**
   * End the observation when the function resolves, recording its return value as the output
   * (default `true`). Set to `false` for work that outlives the call, like a stream, and end it
   * yourself with `observation.end({ output })`.
   */
  endOnExit?: boolean;
  /** Groups the trace into a Langfuse session (e.g. the turns of a chat conversation) */
  sessionId?: (args: TArgs) => string | undefined;
};

// ---------- GENERATION ----------
export type RuntimeContext = NonNullable<Parameters<typeof generateText>[0]['runtimeContext']>;

/** Makes the model optional (we fall back to our default model) */
type WithDefaultModel<OPTIONS> = OPTIONS extends unknown
  ? Omit<OPTIONS, 'model'> & {
      /** The model to use for the generation (defaults to our default model) */
      model?: LanguageModelV4;
    }
  : never;

/** Options for `ai.generateText` */
export type GenerateTextOptions<
  TOOLS extends ToolSet,
  OUTPUT extends OutputInterface,
> = WithDefaultModel<Parameters<typeof generateText<TOOLS, RuntimeContext, OUTPUT>>[0]>;

/** Options for `ai.streamText` */
export type StreamTextOptions<
  TOOLS extends ToolSet,
  OUTPUT extends OutputInterface,
> = WithDefaultModel<Parameters<typeof streamText<TOOLS, RuntimeContext, OUTPUT>>[0]>;
