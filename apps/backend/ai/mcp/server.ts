import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { analytics } from '@repo/analytics';
import { config } from '@repo/config';
import { z } from 'zod';

// oxlint-disable-next-line no-namespace -- Namespace import used to auto-register all exported tools
import * as registry from '../tools';
import { runTool, type AiTool, type ToolSession } from '../utils';

/**
 * Create a transport that reconstitutes sessions across Lambda invocations.
 * The first request (initialize) has no session ID — generates a new one.
 * Subsequent requests carry the mcp-session-id header — restores that session.
 */
export const createMcpTransport = ({ sessionId }: { sessionId: string | null }) => {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: sessionId ? () => sessionId : () => crypto.randomUUID(),
  });

  // Ensure we initialize the transport with the session ID if it's provided
  if (sessionId) {
    transport.sessionId = sessionId;
    // @ts-expect-error — _initialized is normally meant to be private, but we need to set it true for lambda since it's stateless
    transport._initialized = true;
  }

  return transport;
};

/** Every registered tool */
const registeredTools: AiTool[] = Object.values(registry);

/** Create a new MCP server instance with the MCP-supported tools registered */
export const createMcpServer = ({
  session,
  tools = registeredTools,
}: {
  session?: ToolSession;
  /** The tools to offer (defaults to the registry; tests pass their own) */
  tools?: AiTool[];
}) => {
  const server = new McpServer({
    name: config.app.name,
    version: '1.0.0',
  });

  for (const tool of tools) {
    // Skip tools that aren't exposed via MCP
    if (!tool.consumers.includes('mcp')) {
      continue;
    }

    // Register the tool with the MCP server
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        // Wrap the raw shape in a Zod object so the MCP SDK can validate it (matches the AI SDK adapter)
        inputSchema: tool.inputSchema ? z.object(tool.inputSchema) : undefined,
        annotations: tool.annotations,
      },
      async (args) => {
        // Only init requests lack a session, and they never call tools
        if (!session) {
          throw new Error('Tool called before the MCP session was resolved');
        }
        const start = Date.now();
        const outcome = await runTool({ tool, args, session });
        await analytics.mcpToolCalled({
          userId: session.user.id,
          organizationId: session.organization.id,
          toolName: tool.name,
          sessionId: session.id,
          success: outcome.ok,
          errorStatus: outcome.ok ? undefined : outcome.status,
          durationMs: Date.now() - start,
        });
        if (outcome.ok) {
          return { content: [{ type: 'text' as const, text: outcome.result }] };
        }
        return { content: [{ type: 'text' as const, text: outcome.message }], isError: true };
      },
    );
  }

  return server;
};
