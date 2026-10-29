import { z } from 'zod';

import { createTool } from '@/ai/utils';
import { BadRequestError, UnprocessableError } from '@/api/error';
import { sandboxManager } from '@/services/daytona';

// These tools are chat-only (`consumers: ['chat']`): MCP clients run their own code

/** Get the sandbox, throwing if unavailable */
const requireSandbox = async (conversationId: string | undefined) => {
  if (!conversationId) {
    throw new BadRequestError('Code execution requires an active conversation.');
  }
  return sandboxManager.getOrCreate(conversationId);
};

/** Formats a process's output as a code block, noting when it printed nothing */
const formatOutput = (output: string) =>
  output.trim() ? `\`\`\`\n${output.trimEnd()}\n\`\`\`` : '_No output._';

/** Maps each image in /output/ to when it was last written (the folder may not exist yet) */
const listOutputImages = async (sandbox: Awaited<ReturnType<typeof requireSandbox>>) => {
  const files = await sandbox.fs.listFiles('/output').catch(() => []);
  return new Map(
    files
      .filter((file) => !file.isDir && /\.(png|jpg|jpeg|gif|svg)$/i.test(file.name))
      .map((file) => [file.name, file.modTime]),
  );
};

/** Formats a failed process's exit code and output */
const formatFailure = ({ exitCode, result }: { exitCode: number; result: string }) =>
  `Error (exit code ${String(exitCode)}):\n\n${formatOutput(result)}`;

/** Execute Python code in a persistent sandboxed environment */
export const runCode = createTool({
  name: 'run-code',
  description:
    'Execute Python code in a persistent sandboxed environment. Files and variables persist across calls within the conversation. Use for data analysis, calculations, file processing, and generating charts. Save charts to /output/ directory.',
  inputSchema: {
    code: z.string().describe('Python code to execute'),
    timeout: z.number().optional().describe('Timeout in seconds (default 30)'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  consumers: ['chat'],
  handler: async (args, session) => {
    const sandbox = await requireSandbox(session.conversationId);
    const before = await listOutputImages(sandbox);
    const response = await sandbox.process.codeRun(args.code, undefined, args.timeout ?? 30);
    if (response.exitCode !== 0) {
      throw new UnprocessableError(formatFailure(response));
    }

    // Report only the images this run wrote, not every chart from earlier runs
    const written = [...(await listOutputImages(sandbox))]
      .filter(([name, modTime]) => before.get(name) !== modTime)
      .map(([name]) => `- ${name}`);
    const outputNote =
      written.length > 0 ? `\n\n**Generated files in /output/:**\n${written.join('\n')}` : '';
    return `${formatOutput(response.result)}${outputNote}`;
  },
});

/** Write content to a file in the sandbox */
export const sandboxWriteFile = createTool({
  name: 'write-file',
  description:
    'Write content to a file in the sandbox. Use for saving data, scripts, configs, or CSV files for analysis.',
  inputSchema: {
    path: z.string().describe('File path in the sandbox (e.g., /home/daytona/data.csv)'),
    content: z.string().describe('File content to write'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  consumers: ['chat'],
  handler: async (args, session) => {
    const sandbox = await requireSandbox(session.conversationId);
    await sandbox.fs.uploadFile(Buffer.from(args.content, 'utf8'), args.path);
    return `File written to ${args.path}.`;
  },
});

/** Read a file from the sandbox */
export const sandboxReadFile = createTool({
  name: 'read-file',
  description:
    'Read a file from the sandbox. Use to check results, review generated data, or read analysis output.',
  inputSchema: {
    path: z.string().describe('File path to read'),
  },
  annotations: { readOnlyHint: true, destructiveHint: false },
  consumers: ['chat'],
  handler: async (args, session) => {
    const sandbox = await requireSandbox(session.conversationId);
    const content = await sandbox.fs.downloadFile(args.path);
    const text = content.toString('utf8');
    // Tag the block with the file's extension (e.g. `py`, `csv`) so it's highlighted
    const extension = /\.([a-z0-9]+)$/i.exec(args.path)?.[1] ?? '';
    return `\`\`\`${extension}\n${text.trimEnd()}\n\`\`\``;
  },
});

/**
 * Commands the model may run in the sandbox shell. This keeps it to the intended uses, but the
 * sandbox is the security boundary: `run-code` already runs arbitrary Python there.
 */
const ALLOWED_COMMAND_PREFIXES = [
  'pip install',
  'pip3 install',
  'python',
  'python3',
  'ls',
  'cat',
  'head',
  'tail',
  'wc',
  'find',
  'grep',
  'mkdir',
  'cp',
  'mv',
  'echo',
  'pwd',
  'cd',
  'chmod',
];

/** Run a shell command in the sandbox */
export const sandboxExecuteCommand = createTool({
  name: 'execute-command',
  description: `Run a shell command in the sandbox. Allowed commands: ${ALLOWED_COMMAND_PREFIXES.join(', ')}. Use for installing packages and running scripts.`,
  inputSchema: {
    command: z.string().describe('Shell command to run'),
    cwd: z.string().optional().describe('Working directory'),
    timeout: z.number().optional().describe('Timeout in seconds (default 30)'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  consumers: ['chat'],
  handler: async (args, session) => {
    // Block shell metacharacters (and newlines) so one allowed command can't chain another
    if (/[;|&`$><\n\r]/.test(args.command)) {
      throw new BadRequestError(
        'Shell metacharacters (;|&`$><) and newlines are not permitted in commands.',
      );
    }

    // Match whole words, so `python` doesn't admit `pythonx` or `pip install` admit `pip uninstall`
    const command = args.command.trim();
    const commandBase = command.split(/\s+/)[0] ?? '';
    const isAllowed = ALLOWED_COMMAND_PREFIXES.some(
      (prefix) => command === prefix || command.startsWith(`${prefix} `),
    );
    if (!isAllowed) {
      throw new BadRequestError(
        `Command "${commandBase}" is not allowed. Permitted: ${ALLOWED_COMMAND_PREFIXES.join(', ')}`,
      );
    }

    const sandbox = await requireSandbox(session.conversationId);
    const response = await sandbox.process.executeCommand(
      args.command,
      args.cwd,
      undefined,
      args.timeout ?? 30,
    );

    if (response.exitCode !== 0) {
      throw new UnprocessableError(formatFailure(response));
    }
    return formatOutput(response.result);
  },
});
