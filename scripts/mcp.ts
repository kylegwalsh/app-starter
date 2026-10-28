/**
 * Connects an MCP client (e.g. Claude Code via .mcp.json) to the current SST
 * stage's MCP server over stdio.
 *
 * The API URL varies per stage, so it's read from `.sst/outputs.json` (written
 * by `bun dev` / `bun deploy`) and handed to mcp-remote, which handles the
 * OAuth flow and proxies requests to the remote server.
 *
 * stdout is the MCP transport, so all logging must go to stderr.
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const outputsPath = join(import.meta.dirname, '..', '.sst', 'outputs.json');

/** Reads the deployed API URL from the SST outputs, if present */
const getApiUrl = () => {
  if (!existsSync(outputsPath)) {
    return;
  }

  const outputs: unknown = JSON.parse(readFileSync(outputsPath, 'utf8'));
  if (typeof outputs !== 'object' || outputs === null || !('apiUrl' in outputs)) {
    return;
  }

  return typeof outputs.apiUrl === 'string' ? outputs.apiUrl : undefined;
};

const apiUrl = getApiUrl();
if (!apiUrl) {
  console.error(`No apiUrl found in ${outputsPath}. Run 'bun dev' (or 'bun deploy') first.`);
  process.exit(1);
}

const proxy = spawn(process.execPath, ['x', 'mcp-remote', `${apiUrl}/mcp`], { stdio: 'inherit' });

// Keep the proxy's lifecycle tied to ours
proxy.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => proxy.kill(signal));
}
