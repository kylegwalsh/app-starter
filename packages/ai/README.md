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

Wrap AI tasks with `ai.observe` so each one is traced in Langfuse with its input and output (calls outside it are still traced individually):

```ts
export const summarize = ai.observe('summarize', async (input: { notes: string }) => {
  const { text } = await ai.generateText({ prompt: `Summarize: ${input.notes}` });
  return text;
});
```
