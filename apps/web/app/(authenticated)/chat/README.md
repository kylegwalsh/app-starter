# Chat Feature

AI-powered chat with tool calling, conversation persistence, and file uploads.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (apps/web)                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ ChatProvider │  │  ChatView    │  │ ChatWidget    │  │
│  │ (useChat)    │──│ (messages,   │  │ (floating     │  │
│  │              │  │  input, err) │  │  sheet)       │  │
│  └──────┬───────┘  └──────────────┘  └───────────────┘  │
│         │ DefaultChatTransport                          │
│         │ (credentials: 'include')                      │
└─────────┼───────────────────────────────────────────────┘
          │ POST /api/chat (streaming)
          ▼
┌─────────────────────────────────────────────────────────┐
│  Backend (apps/backend)                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Hono /api/   │  │ oRPC /rpc/   │  │ MCP tools    │  │
│  │ chat (stream)│  │ conversations│  │ (in-process)  │  │
│  │              │  │ (CRUD)       │  │              │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
│         │    ┌────────────┴──────────────────┘          │
│         │    │  MCP adapter (mcp/adapter.ts)            │
│         │    │  Converts MCP tools → AI SDK tools       │
│         │    │  Zero network overhead (in-process)      │
│         ▼    ▼                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Postgres (Prisma)                               │   │
│  │  conversation: id, userId, orgId, title          │   │
│  │  message: id, conversationId, role, parts (JSON) │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Streaming Route (Hono, not oRPC)

The chat endpoint is a direct Hono route at `POST /api/chat`, not an oRPC procedure. This is because the Vercel AI SDK's `useChat` hook expects a specific streaming response format (`toUIMessageStreamResponse()`), which doesn't fit oRPC's RPC protocol. Conversation CRUD (list, get, delete, rename) uses oRPC as normal.

### MCP Tool Adapter (In-Process)

Rather than connecting to our own MCP server over HTTP (which would add 2 network hops + auth per tool call), we convert MCP tool definitions to native AI SDK tools in-process via `mcp/adapter.ts`. Tool logic is defined once in `mcp/tools/`, and the adapter reads those same definitions. Zero latency overhead.

### Message Storage (UIMessage JSON)

Messages are stored with their `parts` as a JSON column in Postgres. This preserves the full Vercel AI SDK `UIMessage` format (text, tool invocations, tool results, file parts) and allows round-tripping without lossy conversion. This is the SDK's recommended persistence approach.

### AI-Generated Titles

When a new conversation starts, we fire `ai.generateObject()` in parallel with the chat stream to generate a short descriptive title. This runs concurrently — no added latency to the user's response.

### Access Control

All conversations are scoped to `userId + organizationId`. Switching organizations shows a different conversation list. The chat route and all CRUD endpoints enforce this scoping.

## File Uploads (Planned)

### Storage

Files are uploaded to a private S3 bucket at the path:

```
/uploads/{organizationId}/{conversationId}/{fileId}.{ext}
```

### Access Control (CloudFront + Signed Cookies)

Files are served through a CloudFront distribution with signed cookies:

1. When a user authenticates, a CloudFront signed cookie is set scoped to `/uploads/{orgId}/*`
2. File URLs in chat history are permanent CloudFront URLs (e.g., `https://cdn.app.com/uploads/{orgId}/{convId}/{fileId}.png`)
3. Only users with a valid org-scoped cookie can access the files
4. Cookies refresh with the auth session and expire when the session does

This approach means:

- URLs stored in message parts are stable forever (no expiring presigned URLs)
- All org members can view files in shared conversations
- No per-image auth overhead (cookie covers all files in the org)
- Users removed from an org lose access when their cookie expires

### Sharing (Future)

Conversations can be shared via a share link (`/chat/shared/{shareToken}`):

- **Within org**: Works automatically — all members have the org-scoped cookie
- **External (public link)**: Shared view proxies images through an API route that validates the share token, or generates short-lived presigned S3 URLs at render time
- Share links are read-only and revocable by the conversation owner

## Routes

| Route                                  | Type             | Description                                 |
| -------------------------------------- | ---------------- | ------------------------------------------- |
| `POST /api/chat`                       | Hono (streaming) | Send messages, receive streamed AI response |
| `GET /rpc/conversations.list`          | oRPC             | List user's conversations (paginated)       |
| `GET /rpc/conversations.get`           | oRPC             | Get conversation with all messages          |
| `PATCH /rpc/conversations.updateTitle` | oRPC             | Rename a conversation                       |
| `DELETE /rpc/conversations.delete`     | oRPC             | Delete a conversation                       |

## Pages

| Path         | Description           |
| ------------ | --------------------- |
| `/chat`      | New conversation      |
| `/chat/{id}` | Existing conversation |

## Components

### Design System (`packages/design/components/chat/`)

Presentational components with no AI SDK dependency:

- `ChatInput` — Textarea + send button, Enter to submit
- `ChatMessage` — Message bubble with avatar, copy, thumbs up/down
- `ChatMessages` — Scrollable container with smart auto-scroll
- `ChatToolInvocation` — Tool call status (loading/result/error)
- `ChatTypingIndicator` — Animated "Thinking..." indicator
- `ChatError` — Inline error with "Try again" button

### App Components (`apps/web/components/chat/`)

Wire up the AI SDK:

- `ChatProvider` — `useChat` hook wrapper, React context
- `ChatView` — Full chat view with markdown rendering
- `ChatSidebar` — Conversation list with create/delete
- `ChatWidget` — Floating sheet for embedding chat anywhere

## Error Handling

Follows the ChatGPT pattern:

- Errors are shown **inline** where the assistant's response would appear (not a global banner)
- A **"Try again"** button calls `regenerate()` to retry the last response
- The user's message is never lost
- The error replaces the typing indicator

## Feedback

- **Thumbs up** — immediate submit, no popover. Scores the Langfuse trace as positive.
- **Thumbs down** — opens a popover asking "How could this response be improved?" with an optional comment. Scores the Langfuse trace as negative with the comment.
- Feedback is stored as `Boolean` on the Message model. Comments are sent to Langfuse only (not stored in DB).
- The Langfuse `traceId` flows from backend → frontend via `messageMetadata` in the AI SDK stream.

## Code Execution (Daytona)

Each conversation has a persistent sandboxed environment powered by [Daytona](https://daytona.io). The AI can run Python code, read/write files, and install packages. Files persist across messages.

### How It Works

```
User: "Analyze this data"
  │
  AI decides what to do, calls tools:
  ├─ execute-command: "pip install pandas matplotlib"
  ├─ write-file: saves data to /data/input.csv
  ├─ run-code: Python script that reads, processes, and charts the data
  │
  AI responds with insights + inline chart
```

### Tools

| Tool              | Description                                |
| ----------------- | ------------------------------------------ |
| `run-code`        | Execute Python code in the sandbox         |
| `write-file`      | Write content to a file in the sandbox     |
| `read-file`       | Read a file from the sandbox               |
| `execute-command` | Run shell commands (pip install, ls, etc.) |

### Sandbox Lifecycle

- **Auto-stop**: 15 min idle (restarted transparently on next use)
- **Auto-archive**: 7 days stopped (restored transparently)
- **Auto-delete**: 30 days (starts fresh)

### Data Pipeline Pattern (Future)

For large datasets, tools write directly to the sandbox filesystem rather than passing data through the AI's context window:

```
Tool: query-data({ sql: "SELECT ...", outputPath: "/data/results.csv" })
  → Executes SQL against read-only replica
  → Streams 100K rows directly into sandbox as CSV
  → Returns to AI: "Wrote 100,000 rows to /data/results.csv (45MB)"

Tool: run-code({ code: "df = pd.read_csv('/data/results.csv')..." })
  → Processes the data in the sandbox
```

The AI orchestrates the flow but never handles bulk data.
