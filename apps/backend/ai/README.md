# AI Integration

AI capabilities for the backend — chat streaming, tool execution, and MCP server support. Built on the Vercel AI SDK with Langfuse observability.

```text
ai/
  tools.ts         Tool registry — re-exports every feature's `tools.ts`
  sdk.ts           Converts tool definitions to AI SDK format for chat
  utils.ts         Shared types (ToolSession, AiTool, createTool)
  mcp/
    server.ts      MCP server + transport (for external clients)
    session.ts     DB-backed MCP session resolution
```

## Tools

Tools live with the feature they belong to (`features/<feature>/tools.ts`), are defined once, and are automatically available in two contexts:

1. **Chat** — `streamChatTurn` (`features/chat/operations.ts`) converts tools to AI SDK format via `sdk.ts` and passes them to `streamText`
2. **MCP** — the MCP server (`mcp/server.ts`) registers tools for external clients (e.g., Claude Desktop, Cursor)

### Adding a New Tool

1. Add it to the owning feature's `tools.ts` (e.g. `features/organization/tools.ts`)
2. Export one or more tools using `createTool`:

```typescript
import { z } from 'zod';

import { createTool } from '@/ai/utils';

export const myTool = createTool({
  name: 'my-tool',
  description: 'What this tool does — the AI reads this to decide when to use it',
  inputSchema: {
    param: z.string().describe('Description of the parameter'),
  },
  annotations: { readOnlyHint: true, destructiveHint: false },
  // Surfaces the tool is exposed through — explicit so we never accidentally
  // ship a chat-only helper over MCP (or vice versa).
  // Use ['chat'] for tools that don't make sense to external agents, or
  // ['mcp'] for the inverse.
  consumers: ['chat', 'mcp'],
  handler: async (args, session) => {
    const result = doSomething(args.param);
    return result;
  },
});
```

3. If it's the feature's first tool, register the file in `ai/tools.ts`:

```typescript
export * from '@/features/my-feature/tools';
```

That's it — the tool auto-registers in both chat and MCP.

## Chat Streaming

The chat endpoint is a protected Hono route (`features/chat/routes.ts`) backed by `sendMessage` in `features/chat/operations.ts`. It uses the [Vercel AI SDK](https://ai-sdk.dev) for streaming (`streamText`) and returns the result through `createUIMessageStreamResponse()`. The frontend consumes it with the SDK's own `DefaultChatTransport` in `useChat`.

## MCP Server

The MCP server (`mcp/server.ts`) exposes tools to external MCP clients via OAuth-authenticated Streamable HTTP. Session state is persisted in the database (`mcp/session.ts`) to support org switching across stateless Lambda invocations. The adapter lives at `api/adapters/mcp.ts`.
