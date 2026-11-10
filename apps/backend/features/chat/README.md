# Chat

AI chat with tools, saved conversations, file attachments and code execution. The frontend lives in `apps/web/components/chat/`.

## Routes

| Route                                     | Description                                            |
| ----------------------------------------- | ------------------------------------------------------ |
| `POST /api/chat`                          | Send a message and stream the AI response              |
| `POST /api/chat/conversations/:id/cancel` | Stop generation and save the partial reply             |
| `GET /api/chat/conversations[/:id]`       | List conversations, or get one with its messages       |
| `PATCH` / `DELETE /conversations/:id`     | Rename or delete a conversation                        |
| `POST /api/chat/feedback`                 | Thumbs up/down, scored on the message's Langfuse trace |
| `POST /api/uploads/create-upload-url`     | Pre-sign a direct-to-S3 upload                         |

## How a turn works

`sendMessage` in `operations.ts` handles a turn from start to finish:

1. The client sends only the new message. The server finds or creates the conversation and claims its lock.
2. `streamChatTurn` prepares attachments, compacts the context and calls `streamText` with our tools. For a new conversation, a title is generated alongside it.
3. The reply streams to the client. When it finishes, the server saves the assistant message and the updated context size, then releases the lock.

## Lock and cancel

- `conversation.generatingUntil` is a lease (`lib/lock.ts`). Only one response generates per conversation at a time, and a second send gets a 409. A heartbeat extends the lease, and it expires on its own if the Lambda dies.
- Cancelling clears the lock and saves the partial reply. The heartbeat then sees the lost lock, aborts the model and skips saving.

## Context compaction

Long threads outgrow the model's 1M-token input limit, mostly because of tool results. `compactContext` (`lib/compaction.ts`) runs before every step and clears old tool results from the messages we send. Stored history is never changed.

- It sweeps above 80% of the limit, and only if that reclaims at least 15%. We avoid small sweeps because each one causes a cache miss and increases costs.
- The end of the thread is protected (since it's most relevant): the live step, or the last 10% of the limit, whichever is larger.
- Only read-only tools (`annotations.readOnlyHint`) are cleared. Write results hold ids that can't be re-fetched.
- Size is the provider's last measured count plus an estimate for new content. It's stored in `conversation.contextTokens`.
- The sweep boundary is stored in `conversation.compactedThrough`. We always sweep from this point moving forward to ensure we maintain the new cache.

## File uploads

- Files upload straight to the private `uploads` bucket. The presigned POST pins the content type and size and expires after 5 minutes.
- The organization prefix in each key is the security boundary. Objects expire after 60 days.
- Stored links are signed for 24 hours and re-signed on every conversation load, after the ownership check.
- Bedrock rejects a whole turn for unsupported file types or files over its size and count limits. We store unsupported files in the code sandbox instead: `prepareAttachmentsForModel` (`lib/attachments.ts`) sends readable files as-is and replaces the rest with a note saying why and where the file is in the sandbox.

## Code execution (Daytona)

The Daytona code sandbox is optional. It's on once `DAYTONA_API_KEY` is declared in `infra/secrets.ts`, and `bun run init` offers to set it up. Without it, the sandbox tools and every mention of the sandbox are left out.

The sandbox provides an isolated location that the agent can treat as a scratch pad to create files or run code.
