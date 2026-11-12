# AI Integration

Tools and the MCP server. For how chat itself works, see `features/chat/README.md`.

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

Tools live with the feature they belong to (`features/<feature>/tools.ts`) and are defined once. Chat converts them with `sdk.ts`, and the MCP server registers them for external clients like Claude Code and ChatGPT.

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
  // Where the tool is exposed (explicit so chat-only tools never leak over MCP)
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

## MCP Server

The MCP server (`mcp/server.ts`) exposes tools to external clients at `/mcp` over Streamable HTTP. The adapter lives at `api/adapters/mcp.ts`.

- **Auth**: Better Auth's OAuth provider plugin. Clients sign in with a standard OAuth 2.0 flow and receive a JWT access token.
- **Sessions**: stored in the database (`mcp/session.ts`) so org switching works across stateless Lambda invocations.

### Connecting an MCP client

> **MCP needs a custom domain.** Without one, the API is on API Gateway's default URL, which puts the stage in the path. MCP clients look for OAuth metadata at the domain root (`/.well-known/...`), which that URL can't serve.

The repo's `.mcp.json` already includes the server for Claude Code. It runs `scripts/mcp.ts`, which reads your stage's API URL from `.sst/outputs.json` (written by `bun dev` / `bun deploy`) and connects through [mcp-remote](https://www.npmjs.com/package/mcp-remote), which handles the OAuth sign-in.
