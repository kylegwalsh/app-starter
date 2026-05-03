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

## AI

- Fix conversation element not loading and getting stuck when errors occur in chat
- Fix errors breaking chats (they also don't stay showing after you refresh)
- Verify we are handling errors appropriately from MCP / AI-SDK
  - Ensure that unhandled mcp/tool errors bubble up and get reported to Posthog
- Ensure we handle cancelling gracefully (wait for tools to resolve)
- Add new storybook stories for new design system files
- Ensure unsupported files are sent to Daytona for code exec
- Fix deep type in mcp/server
- Determine if we're using oRPC chat streaming right
- Prefix chat routes
- Verify MCP still works
- Check out and test Chat UI
- Clean up any generated code
- Create slack app
- Consider moving to REST API for increased timeouts + streaming support (urls are uglier)
- Add Daytona setup to init script (sign up at daytona.io, get API key, `sst secret set DAYTONA_API_KEY <value>`)
- Ensure the bot doesn't focus on data analysis (maybe give it a basic prompt)
- Make Daytona sandbox manager fail gracefully when API key is not configured (return tool error, don't crash)
- Disable chat routes / MCP server if AI is not set up during init (skip importing infra/storage, skip chat route mounting, etc.)

## Worktree

- Verify `bun setup-worktree` works correctly after the .sst symlink change (now symlinks entire .sst dir instead of just .sst/platform)

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

- Add superset config file
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
