import type { Message } from '@prisma/client';
import type { UIMessageChunk } from 'ai';

/** Replays a saved assistant message as a stream, as if it were being generated */
export function* streamFromMessage(message: Message): Generator<UIMessageChunk> {
  yield { type: 'start', messageId: message.id };

  const parts = (Array.isArray(message.parts) ? message.parts : []) as Array<
    Record<string, unknown> & { type: string }
  >;
  // Text and reasoning need IDs to thread their deltas, which saved parts don't carry
  let textCounter = 0;
  let reasoningCounter = 0;
  for (const part of parts) {
    if (part.type === 'text' && typeof part.text === 'string') {
      const id = `replay-text-${textCounter++}`;
      yield { type: 'text-start', id };
      yield { type: 'text-delta', id, delta: part.text };
      yield { type: 'text-end', id };
      continue;
    }
    if (part.type === 'reasoning' && typeof part.text === 'string') {
      const id = `replay-reasoning-${reasoningCounter++}`;
      yield { type: 'reasoning-start', id };
      yield { type: 'reasoning-delta', id, delta: part.text };
      yield { type: 'reasoning-end', id };
      continue;
    }
    if (part.type === 'step-start') {
      yield { type: 'start-step' };
      continue;
    }
    if (part.type === 'file' && typeof part.url === 'string') {
      yield {
        type: 'file',
        url: part.url,
        mediaType: typeof part.mediaType === 'string' ? part.mediaType : '',
      };
      continue;
    }
    if (part.type.startsWith('tool-') || part.type === 'dynamic-tool') {
      const dynamic = part.type === 'dynamic-tool';
      let toolName = part.type.slice('tool-'.length);
      if (dynamic) {
        toolName = typeof part.toolName === 'string' ? part.toolName : 'unknown';
      }
      const toolCallId = typeof part.toolCallId === 'string' ? part.toolCallId : '';
      yield {
        type: 'tool-input-available',
        toolCallId,
        toolName,
        input: part.input,
        dynamic,
      };
      if (part.state === 'output-available' || 'output' in part) {
        yield {
          type: 'tool-output-available',
          toolCallId,
          output: part.output,
          dynamic,
        };
      } else if (part.state === 'output-error' || typeof part.errorText === 'string') {
        yield {
          type: 'tool-output-error',
          toolCallId,
          errorText: typeof part.errorText === 'string' ? part.errorText : 'Tool execution failed',
          dynamic,
        };
      }
    }
  }

  yield { type: 'finish' };
}
