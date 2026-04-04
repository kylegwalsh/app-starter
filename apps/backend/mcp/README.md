# MCP Tools

Model Context Protocol (MCP) tools that extend the AI chat agent's capabilities.

## How It Works

Tools are defined in `mcp/tools/` and automatically registered in two places:

1. **MCP Server** (`mcp/server.ts`) — for external MCP clients (e.g., Claude Desktop, Cursor)
2. **AI SDK Adapter** (`mcp/adapter.ts`) — for the chat agent (in-process, zero network overhead)

This means you define a tool once and it's available to both external MCP clients and the built-in chat.

## Adding a New Tool

1. Create a file in `mcp/tools/` (e.g., `my-tool.ts`)
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
  handler: async (args, session) => {
    // session.userId — the authenticated user
    // session.conversationId — the active conversation (if called from chat)
    const result = doSomething(args.param);
    return { content: [{ type: 'text', text: result }] };
  },
});
```

3. Export from `mcp/tools/index.ts`:

```typescript
export * from './my-tool';
```

That's it — the tool auto-registers in both the MCP server and the chat adapter.

## McpSession

Every tool handler receives a `session` object:

```typescript
type McpSession = {
  accessToken: string; // OAuth token (for MCP clients)
  userId?: string; // Authenticated user ID
  conversationId?: string; // Active conversation (chat only)
};
```

## Tool Categories

### Sandbox Tools (code execution)

Tools that operate inside a Daytona sandbox. The sandbox persists across messages in a conversation.

- `run-code` — Execute Python code
- `write-file` — Write to sandbox filesystem
- `read-file` — Read from sandbox filesystem
- `execute-command` — Run shell commands

### Data Pipeline Tools (future)

Tools that fetch large datasets and write them directly to the sandbox filesystem — the AI never sees the raw data, just metadata (row count, columns, file path). This avoids token limits.

```
AI calls: query-data({ sql: "SELECT ...", outputPath: "/data/results.csv" })
Tool: executes SQL → streams to sandbox → returns "Wrote 45K rows to /data/results.csv"
AI calls: run-code({ code: "import pandas as pd\ndf = pd.read_csv('/data/results.csv')..." })
```

### Simple Tools

Tools with small outputs that the AI reads directly.

- `tell-me-a-joke` — Example tool

## Adapter (MCP → AI SDK)

The adapter (`mcp/adapter.ts`) converts MCP tool definitions to native AI SDK tools at runtime. This means:

- Tools execute **in-process** — no HTTP requests, no auth round-trips
- The same tool handler code runs for both MCP clients and the chat agent
- Tool discovery is automatic — add a tool to `mcp/tools/` and it appears in chat
