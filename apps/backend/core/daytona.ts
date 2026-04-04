import { Daytona, SandboxState } from '@daytonaio/sdk';
import { env } from '@repo/config';
import { log } from '@repo/logs';

import { db } from '@/db';

/** Daytona SDK client — initialized lazily when first needed */
let client: Daytona | undefined;

const getClient = () => {
  if (!client) {
    const apiKey = (env as Record<string, string>).DAYTONA_API_KEY;
    if (!apiKey) {
      throw new Error('DAYTONA_API_KEY is not configured');
    }
    client = new Daytona({ apiKey });
  }
  return client;
};

/** Manages Daytona sandbox lifecycle for chat conversations */
export const sandboxManager = {
  /**
   * Get or create a sandbox for a conversation.
   * Handles all state transitions: stopped → start, archived → recover, deleted → create new.
   */
  getOrCreate: async (conversationId: string) => {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { sandboxId: true },
    });

    const daytona = getClient();

    // Try to reuse existing sandbox
    if (conversation?.sandboxId) {
      try {
        const sandbox = await daytona.get(conversation.sandboxId);

        // Restart if stopped
        if (sandbox.state === SandboxState.STOPPED) {
          log.info({ sandboxId: sandbox.id, conversationId }, 'Restarting stopped sandbox');
          await sandbox.start();
        }

        // Recover if archived
        if (sandbox.state === SandboxState.ARCHIVED) {
          log.info({ sandboxId: sandbox.id, conversationId }, 'Recovering archived sandbox');
          await sandbox.recover();
        }

        return sandbox;
      } catch {
        // Sandbox was deleted or inaccessible — create a new one
        log.info({ conversationId }, 'Previous sandbox unavailable, creating new one');
      }
    }

    // Create a new sandbox
    const sandbox = await daytona.create({
      language: 'python',
      autoStopInterval: 15,
      autoArchiveInterval: 10_080, // 7 days
      autoDeleteInterval: 43_200, // 30 days
      labels: { conversationId },
      envVars: { CONVERSATION_ID: conversationId },
    });

    log.info({ sandboxId: sandbox.id, conversationId }, 'Created new sandbox');

    // Store the sandbox ID on the conversation
    await db.conversation.update({
      where: { id: conversationId },
      data: { sandboxId: sandbox.id },
    });

    return sandbox;
  },
};
