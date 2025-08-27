/* eslint-disable no-console */
import { spawn } from 'node:child_process';

/**
 * To confirm whether the DB schema and migrations are in sync, we will attempt to run the
 * migrate command. If it prompts for input, then the schema and migrations are out of sync
 * and we should kill the process. If it succeeds, then the schema and migrations are in sync.
 */

const command = 'pnpm';
const args = ['db:migrate'];
const prompt = 'Enter a name for the new migration:';

const child = spawn(command, args, { shell: true });

// Set a timeout to kill the process after 60 seconds
const timeout = setTimeout(() => {
  console.error('❌ Migration command timed out after 60 seconds. Exiting with error.\n');
  child.kill();
  process.exit(1);
}, 60_000);

// Listen for stdout data
child.stdout.on('data', (data: Buffer) => {
  const text = data.toString();

  // If the command is prompting for input, then the schema and migrations are out of sync
  if (text.includes(prompt)) {
    console.error('❌ Migration command is prompting for input. Exiting with error.\n');
    // Kill the process gracefully
    child.stdin.write('\u0003');
    process.exit(1);
  }
  process.stdout.write(text);
});

// Listen for the process to exit
child.on('close', (code) => {
  clearTimeout(timeout); // Clear the timeout if the process exits normally
  process.exit(code ?? 1);
});
