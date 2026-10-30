import { z } from 'zod';

import { createTool } from '@/ai/utils';
import { ForbiddenError } from '@/api/error';
import { db } from '@/db';

/** Lists all organizations the user belongs to, including which one is active for MCP */
export const listOrganizations = createTool({
  name: 'list-organizations',
  description:
    'Lists all organizations you belong to and shows which one is currently active for MCP tool calls.',
  annotations: { readOnlyHint: true, destructiveHint: false },
  // Chat runs in the context of a single org (doesn't need this tool)
  consumers: ['chat', 'mcp'],
  handler: async (_args, session) => {
    // Get all organizations the user belongs to
    const memberships = await db.member.findMany({
      where: { userId: session.user.id },
      include: { organization: true },
    });

    // Handle edge case where the user belongs to no organizations
    if (memberships.length === 0) {
      return 'You are not a member of any organizations.';
    }

    // Format the organizations as a Markdown list, with the active one in bold
    const lines = memberships.map((m) =>
      m.organizationId === session.organization.id
        ? `- **${m.organization.name}** (${m.organizationId}) — active`
        : `- ${m.organization.name} (${m.organizationId})`,
    );

    return `## Organizations\n\n${lines.join('\n')}`;
  },
});

/** Switches the active organization for MCP tool calls (persists in current session) */
export const switchOrganization = createTool({
  name: 'switch-organization',
  description: 'Changes the active organization (by organization ID).',
  inputSchema: { organizationId: z.string().describe('The ID of the organization to switch to') },
  annotations: { readOnlyHint: false, destructiveHint: false },
  // Chat runs in the context of a single org (doesn't need this tool)
  consumers: ['mcp'],
  handler: async (args, session) => {
    // Verify the user is a member of this organization
    const membership = await db.member.findFirst({
      where: { userId: session.user.id, organizationId: args.organizationId },
      include: { organization: true },
    });

    // Handle edge case where the user is not a member of the organization
    if (!membership) {
      throw new ForbiddenError(
        'You are not a member of that organization. Use list-organizations to see your options.',
      );
    }

    // Update the MCP session's active organization
    await db.mcpSession.update({
      where: { id: session.id },
      data: { organizationId: args.organizationId },
    });

    return `Active organization set to **${membership.organization.name}** (${membership.organizationId}).`;
  },
});
