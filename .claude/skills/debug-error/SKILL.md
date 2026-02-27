---
name: debug-error
description: Debug and fix a production error using PostHog error tracking. Fetches error details, locates the source, and fixes using TDD.
argument-hint: '[error-url-or-search-term]'
---

# Debug Production Error

Fetch error details from PostHog, locate the source, and fix using TDD.

## Steps

### 1. Identify the Error

Parse `$ARGUMENTS` for input:

- **No argument:** Use `mcp__posthog__list-errors` to show recent errors. Ask the user to pick one.
- **Search term:** Use `mcp__posthog__list-errors` with the term to find matching errors. If multiple matches, ask the user to pick one.
- **Error URL or ID:** Extract the error ID and proceed directly to step 2.

### 2. Fetch Error Details

Use `mcp__posthog__error-details` with the error ID to get:

- Full stack trace
- Error message and type
- Occurrence count and affected users
- First/last seen timestamps
- Browser/OS/environment metadata

### 3. Analyze the Stack Trace

Parse the stack trace frames:

- Identify the originating file and line number
- If source maps are available in the trace, map minified locations back to source
- Note the call chain leading to the error

### 4. Locate in Codebase

Use Grep/Glob to find the relevant source file and function:

- Match file paths and function names from the stack trace to local source
- Read the surrounding code to understand context
- Check recent git history for related changes: `git log --oneline -10 -- <file>`

### 5. Propose a Fix

Explain to the user:

- Root cause analysis
- Proposed fix
- Any risks or side effects

Wait for user confirmation before proceeding.

### 6. Fix with TDD

Invoke `/test-driven-development` to fix the bug:

1. Write a failing test that reproduces the error
2. Implement the minimal fix to pass the test
3. Refactor if needed

Use `/test-backend` or `/test-web` as appropriate for the affected code.

### 7. Verify

Run the full relevant test suite to confirm no regressions.
