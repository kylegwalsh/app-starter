import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Organization, User } from '@prisma/client';

import { createMcpServer } from '@/ai/mcp/server';
import { resolveMcpSession } from '@/ai/mcp/session';
import type { AiTool } from '@/ai/utils';

import { organizationFactory } from './organization-factory';
import { userFactory } from './user-factory';

/** Exports a factory for creating connected MCP test clients */
export const mcpFactory = {
  /** Creates a user and organization, resolves an MCP session for them, and connects a real MCP client */
  createClient: async ({
    user: userFields,
    organization: organizationFields,
    tools,
  }: {
    user?: Partial<User>;
    organization?: Partial<Organization>;
    /** The tools the server offers (defaults to the registry) */
    tools?: AiTool[];
  } = {}) => {
    // Create a default user and organization (with optional field overrides) in parallel
    const [user, organization] = await Promise.all([
      userFactory.createUser(userFields),
      organizationFactory.createOrganization(organizationFields),
    ]);
    await organizationFactory.createMembership({
      userId: user.id,
      organizationId: organization.id,
      role: 'owner',
    });

    // Resolve the session the same way the MCP adapter does (persists the session's active org)
    const session = await resolveMcpSession({ sessionId: crypto.randomUUID(), userId: user.id });

    // Connect a real MCP client to the server in memory, so calls go through the SDK's validation and routing
    const server = createMcpServer({ session, tools });
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    onTestFinished(async () => {
      await client.close();
      await server.close();
    });

    /** Calls a tool and flattens its text content */
    const callTool = async (name: string, args: Record<string, unknown> = {}) => {
      const { content, isError } = CallToolResultSchema.parse(
        await client.callTool({ name, arguments: args }),
      );
      const text = content
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('\n');
      return { text, isError: isError === true };
    };

    return { user, organization, session, client, callTool };
  },
};

/** A connected MCP test client (user + org + session + client) */
export type TestMcpClient = Awaited<ReturnType<typeof mcpFactory.createClient>>;
