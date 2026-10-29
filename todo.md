# TODO

## POSTHOG SUPPORT

- Posthog added a support feature that could replace crisp once it's further along
  - Add identity verification so users can recover conversations via email
  - Set up workflows (hopefully it's built in at some point) to handle emailing customers and us when replies happen
    - We wouldn't want to email if the customer already saw the reply (maybe delay and add a condition)
  - Update onboarding script to use Posthog support

## AI

- Clean up any generated code
- Figure out crisp chat with new sidebar

- Test chat
- Test storybook
- Test sandbox
- Test compaction

## PRISMA V8

- Wait a bit for it to stabilize, then move to Prisma V8 for large speed up
- Drop custom lambda layer stuff
- See if we should store generated types in client and remove generate step in postinstall + ci if possible
- See if they changed the way migrations are handled
- Cache PrismaClient instance between Lambda invocations to reduce cold-start time
- Blockers (no merged fixes yet, Oct 2026):
  - Better Auth prisma adapter doesn't support v8: https://github.com/better-auth/better-auth/issues/9636 (first attempt closed: https://github.com/better-auth/better-auth/pull/10099)
  - No v8 PGlite adapter for tests: https://github.com/prisma/orm/issues/23752

## SLACK

- Create slack app using chat-sdk

## OTHER

- Add new Posthog error trace support
- Pass PostHog build number through with the source maps
- NextJS does not reliably kill port and reload when making infra changes (and sometimes dies and has to restart when AI makes a lot of edits)
- Update migrations once we finish updating schema (chat feature)
- Add verification tool to record videos of changes
- Upgrade oxlint and see if it removes the warnings for react/set-state-in-effect
- Once API Gateway v2 supports response streaming, add it and test that the MCP and general AI apis stream output
- Once Posthog adds transactional email to their SDK, replace the api call in the email package
- When pushing final starter: Remove posthog settings from config / comment out the langfuse secrets / comment out stripe plugin in backend AND frontend / comment out stripe secrets / remove stripe publishable key from config / comment out stripe auth plugin in backend / custom domain

## MINOR IMPROVEMENTS

- Disable autoplay of storybook stories when supported: https://github.com/storybookjs/storybook/discussions/25011
- Once Storybook natively supports react-docgen-typescript on TS 7 (https://github.com/storybookjs/storybook/pull/36771), run `storybook upgrade` and remove the `registerHooks` TypeScript redirect in `apps/storybook/.storybook/main.ts` (keep `@typescript/typescript6`)
- Once SST fixes the issue with hot reloading a monorepo package (like config) on Windows, remove the "bun dev" GODEBUG flag - https://github.com/anomalyco/sst/issues/7036
