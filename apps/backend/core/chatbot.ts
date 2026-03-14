import { createSlackAdapter, type SlackEvent } from '@chat-adapter/slack';
import { createPostgresState } from '@chat-adapter/state-pg';
import { ai } from '@repo/ai';
import { env } from '@repo/config';
import { log } from '@repo/logs';
import { Chat } from 'chat';

import { db } from '@/db/connect';

const slackEnv = env as Record<string, string>;

/** Slack adapter configured for multi-workspace OAuth */
const slackAdapter = createSlackAdapter({
  signingSecret: slackEnv.SLACK_SIGNING_SECRET,
  clientId: slackEnv.SLACK_CLIENT_ID,
  clientSecret: slackEnv.SLACK_CLIENT_SECRET,
});

/** Chat SDK bot instance */
const bot = new Chat({
  userName: 'assistant',
  adapters: { slack: slackAdapter },
  state: createPostgresState({ url: slackEnv.DATABASE_URL }),
});

// ---------- EVENT HANDLERS ----------

/** Respond to @mentions with an AI-generated reply */
bot.onNewMention(async (thread, message) => {
  log.info({ platform: 'slack', threadId: thread.id }, 'Bot mentioned');

  // Extract Slack team ID from the raw event to look up organization context
  const teamId = (message.raw as SlackEvent)?.team_id;
  const workspace = teamId ? await db.slackWorkspace.findUnique({ where: { teamId } }) : undefined;

  const systemPrompt = workspace
    ? `You are a helpful assistant for the "${workspace.organizationId}" organization, responding in Slack. Keep responses concise and helpful.`
    : 'You are a helpful assistant responding in Slack. Keep responses concise and helpful.';

  const response = await ai.generateText({
    name: 'slack-mention-reply',
    model: ai.models.bedrock['claude-4-5-haiku'],
    system: systemPrompt,
    prompt: message.text,
  });

  await thread.post(response.text);
  await thread.subscribe();
});

/** Respond to follow-up messages in subscribed threads */
bot.onSubscribedMessage(async (thread, message) => {
  log.info({ platform: 'slack', threadId: thread.id }, 'Subscribed thread message');

  const response = await ai.generateText({
    name: 'slack-thread-reply',
    model: ai.models.bedrock['claude-4-5-haiku'],
    system:
      'You are a helpful assistant responding in a Slack thread. Keep responses concise and helpful.',
    prompt: message.text,
  });

  await thread.post(response.text);
});

// ---------- EXPORTS ----------

/** Chat SDK bot and Slack adapter */
export const chatbot = {
  bot,
  slackAdapter,
};
