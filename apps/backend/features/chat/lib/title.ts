import { ai } from '@repo/ai';
import { type UIMessage, Output } from 'ai';
import { z } from 'zod';

/** Seeds a title from the first user text part so a new row never appears "untitled" */
export const getTitleSeed = (messages: UIMessage[]) =>
  messages
    .filter((m) => m.role === 'user')
    .flatMap((m) => m.parts)
    .find((p): p is { type: 'text'; text: string } => p.type === 'text')?.text;

/** Collapses whitespace and truncates a title seed to fit the sidebar */
export const truncateTitle = (seed: string) => {
  const trimmed = seed.trim().replaceAll(/\s+/g, ' ');
  return trimmed.length > 60 ? `${trimmed.slice(0, 60).trimEnd()}…` : trimmed;
};

/** Generates a short sidebar title for a conversation from its first message */
export const generateChatTitle = ai.observe(
  { name: 'generateChatTitle', sessionId: ({ context }) => context.conversationId },
  async ({
    input: { seed },
  }: {
    input: { seed: string };
    /** Only used to group the trace with the conversation's chat turns */
    context: { conversationId: string };
  }) => {
    const { output } = await ai.generateText({
      output: Output.object({ schema: z.object({ title: z.string().max(80) }) }),
      prompt: `Generate a short, descriptive title (3-6 words) for a chat conversation that starts with this message. Aim to keep it under 35 characters so it fits comfortably in a sidebar — slightly longer is fine if needed for clarity.\n\n"${seed.slice(0, 500)}"`,
    });
    return output.title;
  },
);
