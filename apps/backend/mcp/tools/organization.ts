import { z } from 'zod';

import { db } from '@/db';

import { createTool } from '../utils';

/** Lists all organizations the user belongs to, including which one is active for MCP */
export const listOrganizations = createTool({
  name: 'list-organizations',
  description:
    'Lists all organizations you belong to and shows which one is currently active for MCP tool calls.',
  annotations: { readOnlyHint: true, destructiveHint: false },
  handler: async (_args, session) => {
    // Get all organizations the user belongs to
    const memberships = await db.member.findMany({
      where: { userId: session.user.id },
      include: { organization: true },
    });

    // Handle edge case where the user belongs to no organizations
    if (memberships.length === 0) {
      return { content: [{ type: 'text', text: 'You are not a member of any organizations.' }] };
    }

    // Format the organizations into a list of lines
    const lines = memberships.map((m) => {
      const isActive = m.organizationId === session.organization.id;
      return `${isActive ? '→ ' : '  '}${m.organization.name} (${m.organizationId})`;
    });

    return {
      content: [
        {
          type: 'text',
          text: `Organizations:\n${lines.join('\n')}`,
        },
      ],
    };
  },
});

/** Switches the active organization for MCP tool calls (persists in current session) */
export const switchOrganization = createTool({
  name: 'switch-organization',
  description: 'Changes the active organization (by organization ID).',
  inputSchema: { organizationId: z.string().describe('The ID of the organization to switch to') },
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async (args, session) => {
    // Verify the user is a member of this organization
    const membership = await db.member.findFirst({
      where: { userId: session.user.id, organizationId: args.organizationId },
      include: { organization: true },
    });

    // Handle edge case where the user is not a member of the organization
    if (!membership) {
      return {
        content: [
          {
            type: 'text',
            text: 'You are not a member of that organization. Use list-organizations to see your options.',
          },
        ],
        isError: true,
      };
    }

    // Update the MCP session's active organization
    await db.mcpSession.update({
      where: { id: session.sessionId },
      data: { organizationId: args.organizationId },
    });

    return {
      content: [
        {
          type: 'text',
          text: `Active organization set to "${membership.organization.name}" (${membership.organizationId}).`,
        },
      ],
    };
  },
});
