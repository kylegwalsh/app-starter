import { ai } from '@repo/ai';
import { z } from 'zod';

import { createTool } from '../utils';

/** Tells you a joke based on a topic of your choice */
export const tellMeAJoke = createTool({
  name: 'tell-me-a-joke',
  description: 'Tells you a joke based on a topic of your choice',
  inputSchema: { topic: z.string() },
  annotations: { readOnlyHint: true, destructiveHint: false },
  handler: async (args) => {
    const result = await ai.streamText({
      prompt: `Tell me a joke based on the topic: ${args.topic}`,
    });

    // Consume the stream and collect the full text
    const text = await result.text;

    return { content: [{ type: 'text', text }] };
  },
});
