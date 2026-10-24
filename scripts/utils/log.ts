import { styleText } from 'node:util';

// ---------- LOG HELPERS ----------
/** Prints a styled line, keeping any leading blank lines before the marker */
const print = (format: Parameters<typeof styleText>[0], marker: string, text: string) => {
  const [, breaks = '', message = ''] = /^(\n*)([\s\S]*)$/.exec(text) ?? [];
  // styleText drops the colors when the output isn't a terminal (or NO_COLOR is set)
  console.log(`${breaks}${styleText(format, marker ? `${marker} ${message}` : message)}`);
};

/** Colored output for setup scripts, so steps, successes, and problems stand out */
export const log = {
  /** A section heading, like "Setting up PostHog..." */
  step: (text: string) => print(['bold', 'cyan'], '', text),
  /** Something finished (prefixed with ✔) */
  success: (text: string) => print('green', '✔', text),
  /** Something failed (prefixed with ❌) */
  error: (text: string) => print('red', '❌', text),
  /** Something needs attention (prefixed with ⚠) */
  warn: (text: string) => print('yellow', '⚠', text),
};
