import { analytics } from '@repo/analytics';
import { z } from 'zod';

import { createTool } from '@/ai/utils';

/** Sends feedback about this MCP server's tools to the team */
export const submitFeedback = createTool({
  name: 'submit-feedback',
  description: `Send feedback about a tool on THIS MCP server to the team. Never use it for other MCP servers or their tools.

Submit when:
- A tool returned wrong, misleading, or incomplete results (bug).
- No tool exists for what the user asked (feature-request).
- A task took many steps or workarounds, or a tool's parameters were confusing (workflow-friction).
- The user said something worked well (praise).

Submit once per distinct issue per conversation, and skip transient errors that resolved on retry.`,
  inputSchema: {
    feedbackType: z
      .enum(['bug', 'feature-request', 'workflow-friction', 'praise'])
      .describe('What kind of feedback this is'),
    comment: z
      .string()
      .min(1)
      .max(1000)
      .describe('What happened, and what would have made it better'),
    toolName: z.string().optional().describe('The tool the feedback is about, if any'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  // Chat has its own thumbs up/down on each response (doesn't need this tool)
  consumers: ['mcp'],
  handler: async (args, session) => {
    await analytics.feedbackSubmitted({
      userId: session.user.id,
      organizationId: session.organization.id,
      feature: 'mcp',
      feedbackType: args.feedbackType,
      comment: args.comment,
      toolName: args.toolName,
    });
    return 'Thanks, your feedback was sent to the team.';
  },
});
