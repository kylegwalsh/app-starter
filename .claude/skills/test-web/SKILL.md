---
name: test-web
description: Run web app tests (unit or e2e). Use after making changes to web code.
argument-hint: '[unit|e2e] [file-path]'
allowed-tools: Bash(bun web run test*), Bash(bun web run test:e2e*)
---

Run web unit tests (Vitest) or E2E tests (Playwright).

## Steps

1. Parse `$ARGUMENTS` for test type (`unit` or `e2e`) and optional file path
2. For unit tests (default): `bun web run test [-- <file-path> --reporter=verbose]`
3. For E2E tests: `bun web run test:e2e [-- <file-path>]`
4. Report pass/fail summary
5. If tests fail, analyze the output and suggest fixes
