# TODO

## POSTHOG SUPPORT

- Posthog added a support feature that could replace crisp once it's further along
  - Add identity verification so users can recover conversations via email
  - Set up workflows (hopefully it's built in at some point) to handle emailing customers and us when replies happen
    - We wouldn't want to email if the customer already saw the reply (maybe delay and add a condition)
  - Update onboarding script to use Posthog support

## USER INVITES

- Ensure starter supports sending invites
  - Add new routes / logic
  - Ensure creating an account works for the redirect to accept-invite
  - Accepting the invite doesn't automatically load the new organization on the home page
  - Have to allow no organization and have a signup for a demo or something

# CHAT SDK

- Consider moving to REST API for increased timeouts + streaming support (urls are uglier)
- Connect chat SDK
- Create slack app
- Build chat UI for web-app

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

- Update migrations once we finish updating schema (chat feature)
- Add verification tool to record videos of changes
- Upgrade oxlint and see if it removes the warnings for react/set-state-in-effect
- Once API Gateway v2 supports response streaming, add it and test that the MCP and general AI apis stream output
- Once Posthog adds transactional email to their SDK, replace the api call in the email package
- When pushing final starter: Remove posthog settings from config / comment out the langfuse secrets / comment out the loops secret / remove loops setting from config / comment out stripe plugin in backend AND frontend / comment out stripe secrets / remove stripe publishable key from config / comment out stripe auth plugin in backend

## MINOR IMPROVEMENTS

- Disable autoplay of storybook stories when supported: https://github.com/storybookjs/storybook/discussions/25011
- Potentially remove separate authConfig after issue is resolved - https://github.com/better-auth/better-auth/issues/3408
- Once Storybook natively supports react-docgen-typescript on TS 7 (https://github.com/storybookjs/storybook/pull/36771), run `storybook upgrade` and remove the `registerHooks` TypeScript redirect in `apps/storybook/.storybook/main.ts` (keep `@typescript/typescript6`)
- Once SST fixes the issue with hot reloading a monorepo package (like config) on Windows, remove the "bun dev" GODEBUG flag - https://github.com/anomalyco/sst/issues/7036
