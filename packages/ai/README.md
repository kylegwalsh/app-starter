# @repo/ai

AI functionality and tracing utilities (backend-only).

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Structure](#structure)
- [Usage](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- Provides text and structured output generation via the Vercel AI SDK (`ai`), with retries and a default model
- Providers: Amazon Bedrock by default (others like OpenAI/Anthropic/Google can be enabled)
- Integrates with Langfuse for tracing and scoring/feedback

## Structure

- `ai.ts`: AI utilities (generation and tracing helpers)
- `models.ts`: Providers and available models
- `langfuse.ts`: Langfuse client setup

## Usage

```ts
import { ai } from '@repo/ai';
import { Output } from 'ai';
import { z } from 'zod';

// Generate text
const { text } = await ai.generateText({ prompt: 'Summarize our latest release' });

// Generate typed structured output
const { output } = await ai.generateText({
  prompt: 'Create highlights from this changelog: ...',
  output: Output.object({ schema: z.object({ highlights: z.array(z.string()) }) }),
});
```

You can wrap AI tasks with multiple steps with `ai.observe` so each one is traced in Langfuse with its overall input and output (calls outside it are still traced individually). An observed function takes one object: `input` is recorded on the trace, so it should hold everything needed to replay the task, and `context` holds runtime dependencies that shouldn't be recorded (e.g. the signed-in user):

```ts
export const summarize = ai.observe(
  { name: 'summarize' },
  async ({ input: { notes } }: { input: { notes: string } }) => {
    const { text } = await ai.generateText({ prompt: `Summarize: ${notes}` });
    return text;
  },
);

await summarize({ input: { notes } });
```

For work that outlives the call (like a stream), set `endOnExit: false` and end the observation yourself. Annotate the parameter with `Observed<…>` to receive the `observation` handle:

```ts
export const chat = ai.observe(
  {
    name: 'chat',
    // Do not end the trace after exiting the function (streaming is active)
    endOnExit: false,
    // Group each conversation's traces into a Langfuse session
    sessionId: ({ input }) => input.conversationId,
  },
  async ({
    input: { conversationId, messages },
    context: { user },
    observation,
  }: Observed<{
    input: { conversationId: string; messages: UIMessage[] };
    context: { user: AuthUser };
  }>) => {
    const result = await ai.streamText({
      // ...
      // Manually assign the output of the trace once streaming ends
      onFinish: ({ text }) => observation.end({ output: text }),
      onError: ({ error }) => observation.end({ error }),
    });
    return { result, traceId: observation.traceId };
  },
);

await chat({ input: { conversationId, messages }, context: { user } });
```
