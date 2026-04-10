import { z } from 'zod';

import { sandboxManager } from '@/core/daytona';

import { createTool } from '../utils';

/** Get the sandbox, throwing if unavailable */
const requireSandbox = async (conversationId: string | undefined) => {
  if (!conversationId) {
    throw new Error('Code execution requires an active conversation.');
  }
  return sandboxManager.getOrCreate(conversationId);
};

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
  // MCPs manage their own code execution (doesn't need this tool)
  mcpSupported: false,
  handler: async (args, session) => {
    const sandbox = await requireSandbox(session.conversationId);
    const response = await sandbox.process.codeRun(args.code, undefined, args.timeout ?? 30);

    // Check for generated images in /output/
    let outputNote = '';
    try {
      const outputFiles = await sandbox.fs.listFiles('/output');
      const imageFiles = outputFiles.filter(
        (f) => !f.isDir && /\.(png|jpg|jpeg|gif|svg)$/i.test(f.name),
      );
      if (imageFiles.length > 0) {
        const fileNames = imageFiles.map((f) => f.name).join(', ');
        outputNote = `\n\n[Generated files in /output/: ${fileNames}]`;
      }
    } catch {
      // /output/ directory may not exist yet
    }

    if (response.exitCode !== 0) {
      throw new Error(`Error (exit code ${String(response.exitCode)}):\n${response.result}`);
    }
    return `${response.result}${outputNote}`;
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
  // MCPs manage their own code execution (doesn't need this tool)
  mcpSupported: false,
  handler: async (args, session) => {
    const sandbox = await requireSandbox(session.conversationId);
    await sandbox.fs.uploadFile(Buffer.from(args.content, 'utf8'), args.path);
    return `File written to ${args.path}`;
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
  // MCPs manage their own code execution (doesn't need this tool)
  mcpSupported: false,
  handler: async (args, session) => {
    const sandbox = await requireSandbox(session.conversationId);
    const content = await sandbox.fs.downloadFile(args.path);
    return typeof content === 'string' ? content : String(content);
  },
});

/** Allowed command prefixes — restricts what the AI can execute in the sandbox shell */
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
  description:
    'Run a shell command in the sandbox. Allowed commands: pip install, python, ls, cat, head, tail, wc, find, grep, mkdir, cp, mv, echo, pwd. Use for installing packages and running scripts.',
  inputSchema: {
    command: z.string().describe('Shell command to run'),
    cwd: z.string().optional().describe('Working directory'),
    timeout: z.number().optional().describe('Timeout in seconds (default 30)'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  // MCPs manage their own code execution (doesn't need this tool)
  mcpSupported: false,
  handler: async (args, session) => {
    // Block shell metacharacters to prevent command chaining via prompt injection
    const SHELL_META = /[;|&`$><]/;
    if (SHELL_META.test(args.command)) {
      throw new Error('Shell metacharacters (;|&`$><) are not permitted in commands.');
    }

    // Validate command against allowlist to prevent prompt injection abuse
    const commandBase = args.command.trim().split(/\s+/)[0] ?? '';
    const isAllowed = ALLOWED_COMMAND_PREFIXES.some(
      (prefix) => args.command.trim().startsWith(prefix) || commandBase === prefix.split(' ')[0],
    );
    if (!isAllowed) {
      throw new Error(
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
      throw new Error(`Error (exit code ${String(response.exitCode)}):\n${response.result}`);
    }
    return response.result;
  },
});
