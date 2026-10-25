# Chat Feature

AI-powered chat with tool calling, conversation persistence, and file uploads.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (apps/web)                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ ChatProvider │  │  ChatView    │  │ ChatDrawer    │  │
│  │ (app layout, │──│ (messages,   │  │ (right drawer │  │
│  │  owns Chat)  │  │  input, err) │  │  on all pages)│  │
│  └──────┬───────┘  └──────────────┘  └───────────────┘  │
│         │ DefaultChatTransport                          │
│         │ (credentials: 'include')                      │
└─────────┼───────────────────────────────────────────────┘
          │ POST /api/chat (streaming)
          ▼
┌─────────────────────────────────────────────────────────┐
│  Backend (apps/backend)                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Hono /api/   │  │ Hono /api/   │  │ AI tools     │   │
│  │ chat (stream)│  │ chat/convers-│  │ (in-process) │   │
│  │              │  │ ations (CRUD)│  │              │   │
│  └──────┬───────┘  └──────┬───────┘  └───────┬──────┘   │
│         │                 │                  │          │
│         │    ┌────────────┴──────────────────┘          │
│         │    │  Tool adapter (ai/sdk.ts)                │
│         │    │  Converts our tools → AI SDK tools       │
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

### App-Wide Chat State

`ChatProvider` is mounted once in the authenticated layout and owns the active conversation's AI SDK `Chat` instance (created with `new Chat(...)` and passed to `useChat({ chat })`). The chat pages and the drawer are both views of that one chat:

- `/chat` and `/chat/[id]` show it full screen. The route only picks which conversation is active (`startNewConversation()` / `openConversation(id, …)`).
- Every other page can open it in a right-hand drawer from the header's chat button. The drawer's open state isn't persisted across reloads.

Because the instance outlives the pages, a response keeps streaming while the user moves between the full-screen chat and the drawer. The first message of a new conversation is sent directly from the submit handler. Only one conversation streams at a time: switching conversations stops the previous one, and the backend's reconnect flow picks it back up if the user returns.

### Streaming Route

The chat endpoint is a Hono route at `POST /api/chat` (`apps/backend/features/chat/routes.ts`, with the logic in `operations.ts`) that returns the AI SDK's SSE stream via `createUIMessageStreamResponse()`, which is exactly what `useChat`'s `DefaultChatTransport` consumes. Conversation CRUD (list, get, delete, rename) uses the same router, reached through the typed `hc` client + TanStack Query.

### Tool Adapter (In-Process)

Rather than connecting to our own MCP server over HTTP (which would add 2 network hops + auth per tool call), chat converts our tool definitions to native AI SDK tools in-process via `apps/backend/ai/sdk.ts`. Tools are defined once in each backend feature's `tools.ts` and shared by chat and the MCP server. Zero latency overhead.

### Message Storage (UIMessage JSON)

Messages are stored with their `parts` as a JSON column in Postgres. This preserves the full Vercel AI SDK `UIMessage` format (text, tool invocations, tool results, file parts) and allows round-tripping without lossy conversion. This is the SDK's recommended persistence approach.

### AI-Generated Titles

When a new conversation starts, we call `generateChatTitle` (`apps/backend/features/chat/lib/title.ts`) in parallel with the chat stream to generate a short descriptive title. This runs concurrently — no added latency to the user's response. It's traced separately in Langfuse and grouped with the conversation's chat turns by session.

### Access Control

All conversations are scoped to `userId + organizationId`. Switching organizations shows a different conversation list. The chat route and all CRUD endpoints enforce this scoping.

## File Uploads

Users can attach images, PDFs, Office documents and text files (`CHAT_ALLOWED_FILE_TYPES` in `@repo/constants`, max 10 MB each). Files go straight from the browser to a private S3 bucket and never pass through our API.

### Upload Flow

1. **Attach**: the upload starts as soon as a file is staged in the prompt input, so it's usually done by the time the user hits send. A local blob URL renders the preview in the meantime.
2. **Presign**: the client calls `POST /api/uploads/create-upload-url` (`apps/backend/features/uploads/`). The backend returns:
   - a presigned POST (valid for 5 minutes) whose policy pins the content type and caps the size, so S3 rejects the upload even if the client lies about either
   - a signed GET URL (`viewUrl`) for the new file
3. **Upload**: the client POSTs the file to S3 with the returned form fields. A `SignatureDoesNotMatch` rejection is retried up to twice.
4. **Send**: the message's file part stores the `viewUrl`, and the message is persisted with it.

### Storage

Files live in the private `uploads` bucket (`infra/storage.ts`) under:

```
{organizationId}/{nanoid}-{fileName}
```

The organization prefix is the security boundary — only that organization's members are ever handed signed URLs for it. The random prefix keeps re-uploads of the same name from colliding, and the original file name keeps the bucket legible when browsing.

Objects expire after **60 days** (a bucket lifecycle rule that reclaims orphaned uploads). That also applies to files referenced in conversations, so older attachments stop loading after that point.

### Access Control (Signed URLs)

The bucket is never public. Every link is a presigned S3 URL that's valid for 24 hours:

- **Loading a conversation** (`GET /api/chat/conversations/:id`) re-signs each stored file URL after the ownership check, so only conversation members get working links, and links that expired since they were stored are refreshed.
- **Download names**: signed URLs set the `Content-Disposition` file name, so browsers show the original name instead of the prefixed key.

### Sending Files to the Model

When the AI SDK needs a file's contents and the model can't fetch the URL itself, the chat turn reads the bytes directly from S3 with the Lambda's IAM credentials (`downloadUploadsFromS3` in `apps/backend/features/chat/lib/attachments.ts`). An expired stored URL therefore never breaks a conversation. File names are also sanitized and made unique before reaching Bedrock, which rejects most punctuation and duplicate names.

### Sharing (Future)

Conversations could be shared via a link (`/chat/shared/{shareToken}`):

- **Within the organization**: the share view re-signs file URLs after checking membership, the same way loading a conversation does
- **External (public link)**: the share view validates the token and signs short-lived URLs at render time
- Share links would be read-only and revocable by the conversation owner

## Routes

| Route                                        | Type      | Description                                     |
| -------------------------------------------- | --------- | ----------------------------------------------- |
| `POST /api/chat`                             | Streaming | Send messages, receive streamed AI response     |
| `POST /api/chat/conversations/:id/cancel`    | JSON      | Stop generation, persist the partial response   |
| `POST /api/chat/conversations/:id/reconnect` | Streaming | Resume a generation started elsewhere           |
| `GET /api/chat/conversations`                | JSON      | List user's conversations (paginated)           |
| `GET /api/chat/conversations/:id`            | JSON      | Get conversation with all messages              |
| `PATCH /api/chat/conversations/:id`          | JSON      | Rename a conversation                           |
| `DELETE /api/chat/conversations/:id`         | JSON      | Delete a conversation                           |
| `POST /api/chat/feedback`                    | JSON      | Submit thumbs up/down on an assistant message   |
| `POST /api/uploads/create-upload-url`        | JSON      | Presign a direct-to-S3 upload for an attachment |

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

- `ChatProvider` — App-wide chat state (active conversation, uploads, drawer) exposed through React context
- `ChatView` — Full chat view with markdown rendering
- `ChatSidebar` — Conversation list with create/delete
- `ChatDrawer` / `ChatDrawerToggle` — Right-hand drawer showing the active conversation on non-chat pages, and its header button

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
