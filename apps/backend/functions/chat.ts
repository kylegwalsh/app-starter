import { analytics } from '@repo/analytics';
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

import { auth, chatbot, withLambdaContext } from '@/core';
import { db } from '@/db/connect';

/** Create a hono instance to handle routing for our webhook routes */
const app = new Hono();

/** Handle incoming Slack webhook events */
app.post('/webhooks/:platform', async (c) => {
  const platform = c.req.param('platform');
  if (platform !== 'slack') {
    return c.json({ error: 'Unknown platform' }, 404);
  }

  try {
    return await chatbot.bot.webhooks.slack(c.req.raw);
  } catch (error) {
    await analytics.captureException(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/** Handle Slack OAuth callback — links workspace to the authenticated user's organization */
app.get('/webhooks/:platform', async (c) => {
  const platform = c.req.param('platform');
  if (platform !== 'slack') {
    return c.json({ error: 'Unknown platform' }, 404);
  }

  try {
    // Verify the user is authenticated
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.session?.activeOrganizationId || !session?.user?.id) {
      return c.json({ error: 'Authentication required. Please log in first.' }, 401);
    }

    // Process the OAuth callback
    const { teamId } = await chatbot.slackAdapter.handleOAuthCallback(c.req.raw);

    // Link the Slack workspace to the user's organization
    await db.slackWorkspace.upsert({
      where: { teamId },
      create: {
        teamId,
        organizationId: session.session.activeOrganizationId,
        installedById: session.user.id,
      },
      update: {
        organizationId: session.session.activeOrganizationId,
        installedById: session.user.id,
      },
    });

    return c.json({ success: true, teamId });
  } catch (error) {
    await analytics.captureException(error);
    return c.json({ error: 'OAuth callback failed' }, 500);
  }
});

/** The main entry point for the webhook handler */
// @ts-expect-error - The event type for the handler is slightly different from the true AWS event type
export const handler = withLambdaContext<'api'>(handle(app));
