# Code Execution with Daytona (Future)

## Overview

Add a code execution environment to the chat agent using Daytona sandboxes. Each conversation gets a persistent sandbox where the AI can run code, read/write files, and analyze data across multiple messages.

## Architecture

```
User: "Analyze our sales data for Q4"
  │
  ▼
AI decides it needs to run code
  │
  ├─ Tool: fetch-data → Queries Postgres, writes CSV to sandbox filesystem
  ├─ Tool: run-code → Writes + executes Python analysis script
  ├─ Tool: run-code → Generates a chart, uploads to S3
  │
  ▼
AI responds with insights + inline chart image
```

## Sandbox Lifecycle

- **One sandbox per conversation** — files and state persist across messages
- **Auto-stop**: 15 min idle (Daytona default) — restarts automatically on next use
- **Auto-archive**: After 7 days stopped → moved to object storage (cheap)
- **Auto-delete**: After 30 days → permanently removed
- **If deleted**: AI starts fresh, handles gracefully ("I don't have access to the previous files anymore, let me re-fetch the data")

## Daytona SDK Capabilities

### Code Execution

- **Stateless**: `sandbox.process.code_run(code, { env, timeout })` — isolated snippets
- **Stateful interpreter**: `sandbox.code_interpreter.create_context()` → maintains variables/imports across calls within a message
- **Shell commands**: `sandbox.process.exec(command, { cwd, timeout, env })` — install packages, run scripts

### File System

- `sandbox.fs.upload_file(content, path)` — push data into the sandbox
- `sandbox.fs.download_file(path)` — pull results out
- `sandbox.fs.list_files(path)` — browse the workspace
- `sandbox.fs.find_files(path, pattern)` — search file contents

## Implementation Plan

### Step 1: Schema Changes

Add `sandboxId` to the Conversation model:

```prisma
model Conversation {
  ...
  sandboxId String?  // Daytona sandbox ID
}
```

### Step 2: Infrastructure

- Add `DAYTONA_API_KEY` to `infra/secrets.ts`
- Add `@daytonaio/sdk` to backend dependencies
- Create `apps/backend/core/daytona.ts` — singleton SDK client

### Step 3: MCP Tools

**`mcp/tools/code-execution.ts`** — Three tools:

```typescript
// Run code in the conversation's sandbox
export const runCode = createTool({
  name: 'run-code',
  description: 'Execute Python code in a sandboxed environment. Files persist across calls.',
  inputSchema: {
    code: z.string().describe('Python code to execute'),
    timeout: z.number().optional().describe('Timeout in seconds (default 30)'),
  },
  handler: async (args, session) => {
    // 1. Get or create sandbox for this conversation
    // 2. If sandbox is stopped, restart it
    // 3. Execute code via sandbox.process.code_run()
    // 4. Return stdout/stderr
  },
});

// Write a file to the sandbox filesystem
export const writeFile = createTool({
  name: 'write-file',
  description: 'Write content to a file in the sandbox. Use for saving data, scripts, or configs.',
  inputSchema: {
    path: z.string(),
    content: z.string(),
  },
  handler: async (args, session) => {
    // sandbox.fs.upload_file(Buffer.from(content), path)
  },
});

// Read a file from the sandbox filesystem
export const readFile = createTool({
  name: 'read-file',
  description: 'Read a file from the sandbox. Use to check results or review data.',
  inputSchema: {
    path: z.string(),
  },
  handler: async (args, session) => {
    // sandbox.fs.download_file(path)
  },
});
```

### Step 4: Sandbox Manager

**`apps/backend/core/daytona.ts`**

```typescript
export const sandboxManager = {
  /** Get or create a sandbox for a conversation */
  getOrCreate: async (conversationId: string) => {
    // 1. Check if conversation has a sandboxId
    // 2. If yes, check sandbox status (may be stopped/archived)
    //    - Stopped → restart it
    //    - Archived → restore it
    //    - Deleted → create new, update conversation
    // 3. If no, create new sandbox, store sandboxId on conversation
    // 4. Return the active sandbox instance
  },
};
```

Key: The conversation's `sandboxId` is the link. The manager handles all state transitions transparently.

### Step 5: Data Retrieval Tool (Optional)

**`mcp/tools/data-retrieval.ts`**

```typescript
export const fetchData = createTool({
  name: 'fetch-data',
  description: 'Query the database and save results to a file in the sandbox for analysis.',
  inputSchema: {
    query: z.string().describe('Description of what data to fetch'),
    format: z.enum(['csv', 'json']).default('csv'),
    filename: z.string().default('data.csv'),
  },
  handler: async (args, session) => {
    // 1. Use AI to generate a safe SQL query from the description
    // 2. Execute against a READ-ONLY replica
    // 3. Write results to sandbox filesystem
    // 4. Return file path + row count
  },
});
```

### Step 6: Chart/Image Output

When code generates images (matplotlib, etc.):

1. AI saves chart to a file in the sandbox (e.g., `/output/chart.png`)
2. Tool downloads it from the sandbox via `sandbox.fs.download_file()`
3. Uploads to S3 using the existing upload infrastructure
4. Returns the CDN URL as a file part in the response

## Example Conversation Flow

```
User: "Can you analyze our revenue trends for the past year?"

AI: [calls fetch-data] → Queries revenue table, writes to /data/revenue.csv (45,000 rows)
AI: [calls run-code] →
    import pandas as pd
    import matplotlib.pyplot as plt

    df = pd.read_csv('/data/revenue.csv')
    monthly = df.groupby(df['date'].str[:7])['amount'].sum()
    monthly.plot(kind='line', title='Monthly Revenue')
    plt.savefig('/output/revenue_trend.png')
    print(monthly.describe())

AI: "Here's the revenue trend analysis:
    [inline chart image]
    Revenue has grown 23% YoY with a notable dip in March..."

User: "Can you break that down by product category?"

AI: [calls run-code] →  # Same sandbox! revenue.csv is still there
    categories = df.groupby(['category', df['date'].str[:7]])['amount'].sum().unstack()
    categories.T.plot(kind='area', stacked=True)
    plt.savefig('/output/revenue_by_category.png')
    ...
```

## Security Considerations

- **Read-only DB access** — data retrieval tool uses a read replica, never writes
- **Network isolation** — sandbox cannot access internal APIs or other sandboxes
- **Resource limits** — CPU, memory, and execution timeout per command
- **No secrets in sandbox** — API keys and credentials never enter the sandbox environment
- **SQL injection prevention** — AI-generated SQL is validated/parameterized before execution

## Cost Estimate

Per conversation with code execution:

- Active compute (~5 min): ~$0.005
- Idle before auto-stop (15 min): ~$0.017
- Stopped storage (7 days): ~$0.004
- **Total per conversation: ~$0.03**
- **1000 conversations/month: ~$25-30**

## Dependencies

- `@daytonaio/sdk` — Daytona TypeScript SDK
- `DAYTONA_API_KEY` — API secret
- Read-only database replica (for data retrieval tool)
