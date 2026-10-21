# TODO

## POSTHOG WORKFLOWS

- Deprecate Loops in favor of PostHog workflows once it's further along
  - Update onboarding script
    - Go to posthog workflows > click "New channel" > add a domain like account@mail.DOMAIN.com
    - Add the DNS records in your domain host
    - TBD

## POSTHOG MESSAGING

- They are rolling out a new messaging system that will replace crisp

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

## Marketing site

- Consider adding marketing site to repo

## PRISMA V7

- Wait a bit for it to stabilize, then move to Prisma v7 for large speed up
- Drop custom lambda layer stuff
- See if we should store generated types in client and remove generate step in postinstall + ci if possible
- See if they changed the way migrations are handled
- Cache PrismaClient instance between Lambda invocations to reduce cold-start time

## OTHER

- Don't render billing page if no stripe
- Upgrade oxlint and see if it removes the warnings for react/set-state-in-effect
- Create good "clean" command to remove node_modules
- Once API Gateway v2 supports response streaming, add it and test that the MCP and general AI apis stream output
- Debug why first stripe invocation causes SST proxy to die on Windows - https://github.com/sst/sst/issues/6051
- Update migrations once we finish updating schema
- When pushing final starter: Remove posthog settings from config / comment out the langfuse secrets / comment out the loops secret / remove loops setting from config / comment out stripe plugin in backend AND frontend / comment out stripe secrets / remove stripe publishable key from config / comment out stripe auth plugin in backend
- Add verification tool to record videos of changes

## MINOR IMPROVEMENTS

- Disable autoplay of storybook stories when supported: https://github.com/storybookjs/storybook/discussions/25011
- Potentially remove separate authConfig after issue is resolved - https://github.com/better-auth/better-auth/issues/3408
- Once Storybook natively supports react-docgen-typescript on TS 7 (https://github.com/storybookjs/storybook/pull/36771), run `storybook upgrade` and remove the `registerHooks` TypeScript redirect in `apps/storybook/.storybook/main.ts` (keep `@typescript/typescript6`)
- Once SST fixes the issue with hot reloading a monorepo package (like config) on Windows, remove the "bun dev" GODEBUG flag - https://github.com/anomalyco/sst/issues/7036
