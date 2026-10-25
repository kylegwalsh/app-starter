# TODO

## POSTHOG SUPPORT

- Posthog added a support feature that could replace crisp once it's further along
  - Add identity verification so users can recover conversations via email
  - Set up workflows (hopefully it's built in at some point) to handle emailing customers and us when replies happen
    - We wouldn't want to email if the customer already saw the reply (maybe delay and add a condition)
  - Update onboarding script to use Posthog support

## AI

- See if we should move the ai.observe() method higher up the tree (basically start of the function for evals)
  - Should maybe wrap title generation
- Add analytics for using chat
- Verify streamed chat responses put their output in Langfuse since it's async
- Ensure unsupported files are sent to Daytona for code exec
- Ensure we don't overly use Daytona (seems to want to save TODOs there or something)
- Create slack app
- Add Daytona setup to init script (sign up at daytona.io, get API key, `sst secret set DAYTONA_API_KEY <value>`)
- Ensure the bot doesn't focus on data analysis (maybe give it a basic prompt)
- Make Daytona sandbox manager fail gracefully when API key is not configured (return tool error, don't crash)
- Disable chat routes / MCP server if AI is not set up during init (skip importing infra/storage, skip chat route mounting, etc.)
- Clean up any generated code
- Add new storybook stories for new design system files
- Add compaction

## MCP

- Verify MCP streams long text
- Make a note in onboarding that MCP only works with custom domains (along with anything else that requires it?)
- Determine if we want JSON or markdown output
- Add MCP tracing to Langfuse
- Fix deep type in mcp/server
- Add submit_feedback tool to MCP and score in Langfuse
- Get MCP working with local API somehow (so we don't hardcode it)

## Worktree

- Verify `bun setup-worktree` works correctly after the .sst symlink change (now symlinks entire .sst dir instead of just .sst/platform)

## PRISMA V8

- Wait a bit for it to stabilize, then move to Prisma V8 for large speed up
- Drop custom lambda layer stuff
- See if we should store generated types in client and remove generate step in postinstall + ci if possible
- See if they changed the way migrations are handled
- Cache PrismaClient instance between Lambda invocations to reduce cold-start time
- Blockers (no merged fixes yet, Oct 2026):
  - Better Auth prisma adapter doesn't support v8: https://github.com/better-auth/better-auth/issues/9636 (first attempt closed: https://github.com/better-auth/better-auth/pull/10099)
  - No v8 PGlite adapter for tests: https://github.com/prisma/orm/issues/23752

## OTHER

- See if we can drop the database urls as part of github CI and just leverage SST secrets directly
- Add new Posthog error trace support
- Pass PostHog build number through with the source maps
- NextJS does not reliably kill port and reload when making infra changes (and sometimes dies and has to restart when AI makes a lot of edits)
- Update migrations once we finish updating schema (chat feature)
- Add verification tool to record videos of changes
- Upgrade oxlint and see if it removes the warnings for react/set-state-in-effect
- Once API Gateway v2 supports response streaming, add it and test that the MCP and general AI apis stream output
- Once Posthog adds transactional email to their SDK, replace the api call in the email package
- When pushing final starter: Remove posthog settings from config / comment out the langfuse secrets / comment out the loops secret / remove loops setting from config / comment out stripe plugin in backend AND frontend / comment out stripe secrets / remove stripe publishable key from config / comment out stripe auth plugin in backend / custom domain

## MINOR IMPROVEMENTS

- Disable autoplay of storybook stories when supported: https://github.com/storybookjs/storybook/discussions/25011
- Once Storybook natively supports react-docgen-typescript on TS 7 (https://github.com/storybookjs/storybook/pull/36771), run `storybook upgrade` and remove the `registerHooks` TypeScript redirect in `apps/storybook/.storybook/main.ts` (keep `@typescript/typescript6`)
- Once SST fixes the issue with hot reloading a monorepo package (like config) on Windows, remove the "bun dev" GODEBUG flag - https://github.com/anomalyco/sst/issues/7036
