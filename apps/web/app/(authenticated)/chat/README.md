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

`ChatProvider` is mounted once in the authenticated layout and owns the active conversation's AI SDK `Chat` instance (created with `new Chat(...)`). Components subscribe to it with `useActiveChat()` (`useChat({ chat })`), so only the views that render messages re-render while a response streams. The context itself holds just the active conversation and its actions. The chat pages and the drawer are both views of that one chat:

- `/chat` and `/chat/[id]` show it full screen. The route only picks which conversation is active (`startNewConversation()` / `openConversation(id)`).
- Every other page can open it in a right-hand drawer from the header's chat button (`chatDrawerOpenAtom` in `apps/web/atoms/chat.ts`). The drawer's open state isn't persisted across reloads.

Because the instance outlives the pages, a response keeps streaming while the user moves between the full-screen chat and the drawer. Only one conversation streams at a time: switching conversations stops the stream on the client, while the server finishes and saves the response. Opening a conversation whose response is still generating (e.g. in another tab) shows the thinking indicator and polls until the response is saved.

Attachments upload as soon as they're staged (`useChatUploads()` in `chat-uploads.ts`, one TanStack query per file).

### Streaming Route

The chat endpoint is a Hono route at `POST /api/chat` (`apps/backend/features/chat/routes.ts`, with the logic in `operations.ts`) that returns the AI SDK's SSE stream via `createUIMessageStreamResponse()`, which is exactly what `useChat`'s `DefaultChatTransport` consumes. Conversation CRUD (list, get, delete, rename) uses the same router, reached through the typed `hc` client + TanStack Query.

**The server owns the history.** The client sends only the new user message (`{ id, message }`); the server saves it, loads the conversation from the database and answers. A client can't rewrite earlier turns or forge tool results. Re-sending an already-saved message (what `regenerate()` does) is a retry: the replies after that message are deleted and it's answered fresh.

### Generation Lock & Cancelling

`conversation.generatingUntil` is a lease (`lib/lock.ts`): one response generates per conversation at a time (a second send gets a 409), a heartbeat extends it while generating, and it expires on its own if the Lambda dies. Each holder matches on the last expiry it wrote, so a cancelled producer can never extend or release a newer send's lock. Stop calls `POST /conversations/:id/cancel`, which clears the lock and saves the partial reply the user saw. The producer's heartbeat notices the lost lock and aborts the model, so it stops spending tokens and running tools, and it doesn't save its own response.

### Context Compaction

A long thread eventually outgrows the model's 1M-token input limit, and the provider refuses the request rather than truncating it. Tool results are what get us there. `compactContext` (`apps/backend/features/chat/lib/compaction.ts`) is the one entry point. It runs in `streamText`'s `prepareStep` before every step, because one step can append many large tool results. Outside a protected tail it drops reasoning, replaces read-only tool results with `[Result cleared to save context — re-run if needed]`, and blanks tool arguments large enough to be a payload. Stored history is never modified; this is only the view we send.

- **Sizing:** the provider's measured count of the last request (the last step's usage, or `conversation.contextTokens` at the start of a turn), plus an estimate of what's been appended since, at 2.2 characters per token. That ratio fits tool-result JSON and reads high, so sweeps err early. Images are charged a flat 4,784 tokens.
- **Sweep above 80% of the limit, and only if it reclaims at least 15%.** Clearing content rewrites the prompt prefix, so a small sweep pays for that and leaves the thread over the trigger to sweep again next turn. The sweep is all or nothing: it's priced in full before anything is committed.
- **Never touch the tail:** the live step (Anthropic requires its thinking echoed back while its tool calls are pending), or a walk back from the end until 10% of the limit is used, whichever reaches further. The tail is measured in tokens, not turns, since one turn can be the whole thread.
- **Only read-only tools are cleared** (`annotations.readOnlyHint`). Write results carry ids a mutation created and can't be re-fetched. Today that's `read-file` and `list-organizations`, so `run-code` and `execute-command` output is never cleared.
- **The boundary is stored** (`conversation.compactedThrough`), and only a sweep advances it. Re-deriving it each turn would drift as the thread grows, rewriting the prompt prefix on turns where nothing was reclaimed. The measured size after each turn is stored in `conversation.contextTokens`.
- **Observability:** a sweep logs `Compacted chat context` with the boundary, step number and tokens reclaimed.

**Known gap (Claude Sonnet 5.5 thinking):** each thinking block is signed against the exact conversation before it. A sweep changes earlier messages, so thinking blocks in the protected tail no longer match. Accounts created before Aug 31, 2026 are unaffected (the mismatch is only recorded). On newer accounts, the request that performs a sweep can return a 400. Sweeps are rare (each must reclaim 150k+ tokens). If this bites, set `thinking.block_binding.prefix_mismatch_behavior: "drop_block"` (beta `thinking-binding-controls-2026-08-01`) on the request that sweeps.

**Still to come:** once everything outside the tail is cleared, another sweep can't reach the 15% bar. The next rung inside `compactContext` would replace the swept span with a summary.

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

| Route                                     | Type      | Description                                      |
| ----------------------------------------- | --------- | ------------------------------------------------ |
| `POST /api/chat`                          | Streaming | Send a message, receive the streamed AI response |
| `POST /api/chat/conversations/:id/cancel` | JSON      | Stop generation, persist the partial response    |
| `GET /api/chat/conversations`             | JSON      | List user's conversations (paginated)            |
| `GET /api/chat/conversations/:id`         | JSON      | Get conversation with all messages               |
| `PATCH /api/chat/conversations/:id`       | JSON      | Rename a conversation                            |
| `DELETE /api/chat/conversations/:id`      | JSON      | Delete a conversation                            |
| `POST /api/chat/feedback`                 | JSON      | Submit thumbs up/down on an assistant message    |
| `POST /api/uploads/create-upload-url`     | JSON      | Presign a direct-to-S3 upload for an attachment  |

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

- `ChatProvider` — App-wide chat state (the active conversation and its actions) exposed through React context, plus `useActiveChat()` for messages and status
- `ChatView` — Full chat view with markdown rendering
- `ChatSidebar` — Conversation list with create/delete
- `ChatDrawer` / `ChatDrawerToggle` — Right-hand drawer showing the active conversation on non-chat pages, and its header button

## Error Handling

Follows the ChatGPT pattern:

- Errors are shown **inline** where the assistant's response would appear (not a global banner)
- A **"Try again"** button calls `regenerate()` to retry the last response
- The user's message is never lost
- The error replaces the typing indicator
- Failed turns aren't saved, so a conversation that ends on an unanswered user message (a failure, or a server that died mid-response) shows the same error after a reload

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
