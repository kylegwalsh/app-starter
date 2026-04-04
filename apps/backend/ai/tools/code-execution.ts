import { log } from '@repo/logs';
import { z } from 'zod';

import { sandboxManager } from '@/core/daytona';

import { createTool, type ToolResult } from '../utils';

/** Helper to build a successful tool result */
const ok = (text: string): ToolResult => ({ content: [{ type: 'text', text }] });

/** Helper to build an error tool result */
const fail = (text: string): ToolResult => ({ content: [{ type: 'text', text }], isError: true });

/** Get the sandbox, throwing if unavailable so the handler's catch block returns a clean error */
const requireSandbox = async (conversationId: string | undefined) => {
  if (!conversationId) {
    throw new Error('Code execution requires an active conversation.');
  }
  return sandboxManager.getOrCreate(conversationId);
};

/** Execute Python code in a persistent sandboxed environment */
export const runCode = createTool({
  name: 'run-code',
  mcpSupported: false,
  description:
    'Execute Python code in a persistent sandboxed environment. Files and variables persist across calls within the conversation. Use for data analysis, calculations, file processing, and generating charts. Save charts to /output/ directory.',
  inputSchema: {
    code: z.string().describe('Python code to execute'),
    timeout: z.number().optional().describe('Timeout in seconds (default 30)'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async (args, session) => {
    try {
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
        return fail(`Error (exit code ${String(response.exitCode)}):\n${response.result}`);
      }
      return ok(`${response.result}${outputNote}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Code execution failed.';
      log.error({ error, conversationId: session.conversationId }, 'Code execution failed');
      return fail(message);
    }
  },
});

/** Write content to a file in the sandbox */
export const sandboxWriteFile = createTool({
  name: 'write-file',
  mcpSupported: false,
  description:
    'Write content to a file in the sandbox. Use for saving data, scripts, configs, or CSV files for analysis.',
  inputSchema: {
    path: z.string().describe('File path in the sandbox (e.g., /home/daytona/data.csv)'),
    content: z.string().describe('File content to write'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async (args, session) => {
    try {
      const sandbox = await requireSandbox(session.conversationId);
      await sandbox.fs.uploadFile(Buffer.from(args.content, 'utf8'), args.path);
      return ok(`File written to ${args.path}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to write file: ${args.path}`;
      log.error({ error, path: args.path }, 'Failed to write file to sandbox');
      return fail(message);
    }
  },
});

/** Read a file from the sandbox */
export const sandboxReadFile = createTool({
  name: 'read-file',
  mcpSupported: false,
  description:
    'Read a file from the sandbox. Use to check results, review generated data, or read analysis output.',
  inputSchema: {
    path: z.string().describe('File path to read'),
  },
  annotations: { readOnlyHint: true, destructiveHint: false },
  handler: async (args, session) => {
    try {
      const sandbox = await requireSandbox(session.conversationId);
      const content = await sandbox.fs.downloadFile(args.path);
      const text = typeof content === 'string' ? content : String(content);
      return ok(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to read file: ${args.path}`;
      log.error({ error, path: args.path }, 'Failed to read file from sandbox');
      return fail(message);
    }
  },
});

/** Run a shell command in the sandbox */
export const sandboxExecuteCommand = createTool({
  name: 'execute-command',
  mcpSupported: false,
  description:
    'Run a shell command in the sandbox. Use for installing packages (pip install), listing files (ls), or running scripts.',
  inputSchema: {
    command: z.string().describe('Shell command to run'),
    cwd: z.string().optional().describe('Working directory'),
    timeout: z.number().optional().describe('Timeout in seconds (default 30)'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async (args, session) => {
    try {
      const sandbox = await requireSandbox(session.conversationId);
      const response = await sandbox.process.executeCommand(
        args.command,
        args.cwd,
        undefined,
        args.timeout ?? 30,
      );

      if (response.exitCode !== 0) {
        return fail(`Error (exit code ${String(response.exitCode)}):\n${response.result}`);
      }
      return ok(response.result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Command execution failed.';
      log.error({ error, command: args.command }, 'Command execution failed');
      return fail(message);
    }
  },
});
