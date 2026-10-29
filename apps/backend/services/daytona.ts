import { Daytona, SandboxState } from '@daytonaio/sdk';
import { env } from '@repo/config';
import { log } from '@repo/logs';

import { db } from '@/db';

const apiKey = (env as Record<string, string>).DAYTONA_API_KEY;

/** Our Daytona client — undefined when Daytona is not configured */
const daytona = apiKey ? new Daytona({ apiKey }) : undefined;

/** Manages Daytona sandbox lifecycle for chat conversations */
export const sandboxManager = {
  /** Whether Daytona is configured. Without it, chat runs without the code tools */
  isEnabled: daytona !== undefined,
  /**
   * Get or create a sandbox for a conversation.
   * Handles all state transitions: stopped → start, archived → recover, deleted → create new.
   */
  getOrCreate: async (conversationId: string) => {
    // The code tools are hidden when Daytona isn't configured, so this is only a safeguard
    if (!daytona) {
      throw new Error('Code execution is not configured');
    }
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { sandboxId: true },
    });

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
  /** Stops a conversation's sandbox (no-op if it's already gone) */
  stop: async (sandboxId: string) => {
    if (!daytona) {
      return;
    }
    try {
      const sandbox = await daytona.get(sandboxId);
      await sandbox.stop();
    } catch (error) {
      // The sandbox may already be deleted — nothing to stop
      log.info({ err: error, sandboxId }, 'Skipped stopping sandbox');
    }
  },
};
