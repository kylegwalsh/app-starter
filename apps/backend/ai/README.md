# AI Integration

AI capabilities for the backend — chat streaming, tool execution, and MCP server support. Built on the Vercel AI SDK with Langfuse observability.

```text
ai/
  adapter.ts       Converts tool definitions to AI SDK format for chat
  utils.ts         Shared types (ToolSession, AiTool, createTool)
  mcp/
    server.ts      MCP server + transport (for external clients)
    session.ts     DB-backed MCP session resolution
  tools/           Tool definitions (shared across chat and MCP)
```

## Tools

Tools are defined once in `tools/` and automatically available in two contexts:

1. **Chat** — the oRPC chat procedure (`api/routes/chat.ts`) converts tools to AI SDK format via `adapter.ts` and passes them to `streamText`
2. **MCP** — the MCP server (`mcp/server.ts`) registers tools for external clients (e.g., Claude Desktop, Cursor)

### Adding a New Tool

1. Create a file in `tools/` (e.g., `my-tool.ts`)
2. Export one or more tools using `createTool`:

```typescript
import { z } from 'zod';
import { createTool } from '../utils';

export const myTool = createTool({
  name: 'my-tool',
  description: 'What this tool does — the AI reads this to decide when to use it',
  inputSchema: {
    param: z.string().describe('Description of the parameter'),
  },
  annotations: { readOnlyHint: true, destructiveHint: false },
  // By default, tools are supported in both chat and MCP
  // mcpSupported: false,
  // chatSupported: false,
  handler: async (args, session) => {
    const result = doSomething(args.param);
    return result;
  },
});
```

3. Export from `tools/index.ts`:

```typescript
export * from './my-tool';
```

That's it — the tool auto-registers in both chat and MCP.

## Chat Streaming

The chat endpoint is a standard oRPC `protectedProcedure` (`api/routes/chat.ts`). It uses the [Vercel AI SDK](https://ai-sdk.dev) for streaming (`streamText`) and the [oRPC AI SDK integration](https://orpc.dev/docs/integrations/ai-sdk) to stream responses as event iterators. The frontend consumes the stream via `eventIteratorToUnproxiedDataStream` in the `useChat` transport.

## MCP Server

The MCP server (`mcp/server.ts`) exposes tools to external MCP clients via OAuth-authenticated Streamable HTTP. Session state is persisted in the database (`mcp/session.ts`) to support org switching across stateless Lambda invocations. The adapter lives at `api/adapters/mcp.ts`.
