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

- Provides text/object generation via the Vercel AI SDK (`ai`), with retry and provider configuration
- Providers: Amazon Bedrock by default (others like OpenAI/Anthropic/Google can be enabled)
- Integrates with Langfuse for tracing/telemetry (OpenTelemetry exporter) and scoring/feedback
- Trace helpers to create, annotate, score, and flush traces across requests

## Structure

- `ai.ts`: Exposes `ai` utilities:
  - `generateText`, `generateObject` (Vercel AI SDK) with automatic Langfuse telemetry
  - `models` (e.g., Bedrock `claude-3-5-haiku`, `claude-4-sonnet`)
  - `createTrace`, `getTraceId`, `scoreTrace`, `flush`

## Usage

Generate text:

```ts
import { ai } from '@repo/ai';

const { text, finishReason } = await ai.generateText({
  prompt: 'Summarize our latest release in 2 sentences',
});
```

Generate a typed object with Zod:

```ts
import { ai } from '@repo/ai';
import { z } from 'zod';

const releaseNotes = z.object({ summary: z.string(), highlights: z.array(z.string()) });

const result = await ai.generateObject({
  schema: releaseNotes,
  prompt: 'Create a JSON object of highlights from this changelog: ...',
});

const notes = result.object; // typed to z.infer<typeof releaseNotes>
```

Group multiple generations under a custom observation:

```ts
import { ai } from '@repo/ai';

// Wrap multiple AI calls in a custom observation
const result = await ai.startActiveObservation('Analyze Release', async () => {
  const summary = await ai.generateText({
    prompt: 'Summarize the release notes',
    name: 'Generate Summary',
  });

  const highlights = await ai.generateObject({
    schema: HighlightsSchema,
    prompt: `Extract highlights from: ${summary.text}`,
    name: 'Extract Highlights',
  });

  return { summary, highlights };
});

// In Langfuse, this creates the hierarchy:
// Analyze Release
//   > Generate Summary
//   > Extract Highlights
```

Without `startActiveObservation`, generations are grouped at the request level:

```ts
// Creates: GET /my-route > generateText
await ai.generateText({ prompt: '...' });
```

Score a trace:

```ts
await ai.scoreTrace({ traceId, score: true, comment: 'This is a good summary!' });
```

Notes:

- Langfuse is activated when the required env vars are present. Telemetry is attached automatically to generations.
- Use `startActiveObservation` to create logical groupings of AI operations in your traces, making it easier to analyze and debug complex workflows in Langfuse.
