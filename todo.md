# TODO

## BETTER AUTH ADMIN

- Try adding client deployment for admin panel: https://github.com/Tranthanh98/better-auth-dashboard/tree/master/client

## POSTHOG WORKFLOWS

- Deprecate Loops in favor of PostHog workflows once it's further along
  - Update onboarding script
    - Go to posthog workflows > click "New channel" > add a domain like account@mail.DOMAIN.com
    - Add the DNS records in your domain host
    - TBD

## POSTHOG MESSAGING

- They are rolling out a new messaging system that will replace crisp

## oRPC

- Try oRPC
- Remove all tRPC packages
- See if oRPC works without building backend types first

## Hono

- Consider unifying all backend APIs under hono + hono-query

## USER INVITES

- Ensure starter supports sending invites
  - Add new routes / logic
  - Ensure creating an account works for the redirect to accept-invite
  - Accepting the invite doesn't automatically load the new organization on the home page
  - Have to allow no organization and have a signup for a demo or something

## AI

- Create slack app
- Verify OAuth org selection works
- Connect chat SDK
- Build chat UI for web-app using chat SDK
- Possibly set up basic MCP structure
- Rethink how we trace for Langfuse and how we can support evals (input must be easily replayed against functions)

## Marketing site

- Consider adding marketing site to repo

## OTHER

- Login wrote password to url params (seems to be due to hydration and the underlying library not having method="POST") - https://github.com/better-auth-ui/better-auth-ui/issues/343
- On Windows, editing a monorepo package (like config) doesn't cause the backend to hot reload
- Debug why first stripe invocation causes SST proxy to die on Windows (could be related to below issue) - https://github.com/sst/sst/issues/6051
- Update migrations once we finish updating schema
- When pushing final starter: Remove posthog settings from config / comment out the langfuse secrets / comment out the loops secret / remove loops setting from config / comment out stripe plugin in backend AND frontend / comment out stripe secrets / remove stripe publishable key from config / comment out stripe auth plugin in backend

## MINOR IMPROVEMENTS

- Disable autoplay of storybook stories when supported: https://github.com/storybookjs/storybook/discussions/25011
- Remove the patch we applied to the AI SDK after this PR is addressed: https://github.com/vercel/ai/issues/9593
- Potentially remove separate authConfig after issue is resolved - https://github.com/better-auth/better-auth/issues/3408
- Once oxlint/tsgolint is updated, see if we can remove the oxlint ts-ignore rules we added to the backend auth file
