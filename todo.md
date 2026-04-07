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

## MCP

- Sync up cors headers between gateway and middleware
- Figure out if the oauth-provider changes are necessary (unsure what they do)
- Go back through all files and confirm we're not pushing anything we shouldn't

- Remove any unused or overly complex oauth code
- Test whether authorization page is showing logo_uri / name
- Clean up authorization page code / redirects / etc
- Ensure out authorization page shows good scopes and works as expected
- Verify OAuth org selection works (need to add this to authorization page)
- Add organization context to mcp/app
- Clean up visual appearance of mcp consent page
- More thoroughly type the session in mcp/app
- Consider moving to REST API for increased timeouts + streaming support (urls are uglier)

# CHAT SDK

- Connect chat SDK
- Create slack app
- Build chat UI for web-app

# EVALS

- Rethink how we trace for Langfuse and how we can support evals (input must be easily replayed against functions)

## Marketing site

- Consider adding marketing site to repo

## PRISMA V7

- Wait a bit for it to stabilize, then move to Prisma v7 for large speed up
- Drop custom lambda layer stuff
- See if we should store generated types in client and remove generate step in postinstall + ci if possible
- See if they changed the way migrations are handled
- Cache PrismaClient instance between Lambda invocations to reduce cold-start time

## OTHER

- Add SST debug launch file
- Create good "clean" command to remove node_modules
- test whether we need the hacky minimal env anymore or if SST supports running without a deployed stage
- Once API Gateway v2 supports response streaming, add it and test that the MCP and general AI apis stream output
- On Windows, editing a monorepo package (like config) doesn't cause the backend to hot reload
- Debug why first stripe invocation causes SST proxy to die on Windows (could be related to below issue) - https://github.com/sst/sst/issues/6051
- Update migrations once we finish updating schema
- When pushing final starter: Remove posthog settings from config / comment out the langfuse secrets / comment out the loops secret / remove loops setting from config / comment out stripe plugin in backend AND frontend / comment out stripe secrets / remove stripe publishable key from config / comment out stripe auth plugin in backend

## MINOR IMPROVEMENTS

- Disable autoplay of storybook stories when supported: https://github.com/storybookjs/storybook/discussions/25011
- Remove the patch we applied to the AI SDK after this PR is addressed: https://github.com/vercel/ai/issues/9593
- Potentially remove separate authConfig after issue is resolved - https://github.com/better-auth/better-auth/issues/3408
- Once oxlint/tsgolint is updated, see if we can remove the oxlint ts-ignore rules we added to the backend auth file
