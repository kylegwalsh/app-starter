---
name: test-backend
description: Run backend tests. Use after making changes to backend code.
argument-hint: '[file-path]'
allowed-tools: Bash(bun backend run test *)
---

Run backend tests using Vitest.

## Steps

1. Parse `$ARGUMENTS` for an optional file path
2. Run: `bun backend run test [-- <file-path> --reporter=verbose]`
3. Report pass/fail summary
4. If tests fail, analyze the output and suggest fixes
