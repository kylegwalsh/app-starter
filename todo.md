# TODO

## BETTER AUTH ADMIN

- Try adding client deployment for admin panel: https://github.com/Tranthanh98/better-auth-dashboard/tree/master/client

## BETTER AUTH

> Better Auth needs to add better stripe support for organizations (https://github.com/better-auth/better-auth/issues/3772, https://github.com/better-auth/better-auth/issues/2079)

- Attach stripeCustomerId to organization
- Uncomment billing router
- Create /settings/plans page (ability to add / cancel plan)
- Ensure subscriptions work with organizations
- Test normal charges + subscriptions
- Comment out plans in stripe plugin
- Maybe comment out stripe client or ensure it doesn't run without env vars (like langfuse) - ensure it works with setup script

## POSTHOG WORKFLOWS

- Deprecate Loops in favor of PostHog workflows once it's further along
  - Update onboarding script
    - Go to posthog workflows > click "New channel" > add a domain like account@mail.DOMAIN.com
    - Add the DNS records in your domain host
    - TBD

## POSTHOG LOGS

- See if we can deprecate axiom in favor of posthog logs
- Remove weird log level thing we added for axiom (remove axiom as well)

## POSTHOG MESSAGING

- They are rolling out a new messaging system that will replace crisp

## oRPC

- Try oRPC
- Remove all tRPC packages

## OTHER

- Ensure starter supports sending invites
  - Update better-auth-ui
  - Add new routes / logic
  - Ensure creating an account works for the redirect to accept-invite
  - Accepting the invite doesn't automatically load the new organization on the home page
  - Have to allow no organization and have a signup for a demo or something
- Login wrote password to url params (seems to be due to hydration and the underlying library not having method="POST") - https://github.com/better-auth-ui/better-auth-ui/issues/343
- Add chat SDK
- Ensure that SST mono mode kills NextJS ports after web e2e test (keeping port active after run)
- Debug why first stripe invocation causes SST proxy to die on Windows (could be related to below issue) - https://github.com/sst/sst/issues/6051
- When pushing final starter: Remove posthog settings from config / comment out the axiom secret / comment out the langfuse secrets / comment out the loops secret / remove loops setting from config / comment out stripe plugin in backend AND frontend / comment out stripe secrets / remove stripe publishable key from config / comment out stripe auth plugin in backend

## MINOR IMPROVEMENTS

- Disable autoplay of storybook stories when supported: https://github.com/storybookjs/storybook/discussions/25011
- Remove the patch we applied to the AI SDK after this PR is addressed: https://github.com/vercel/ai/issues/9593
- Upgrade SST to see if it improves windows support (like hot reloading backend when modifying packages outside the backend)
- Potentially remove separate authConfig after issue is resolved - https://github.com/better-auth/better-auth/issues/3408
- Try pglite with backend tests whenever the prisma adapter works better
- Once oxlint/tsgolint is updated, see if we can remove the oxlint ts-ignore rules we added to the backend auth file
