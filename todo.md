# TODO

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

## OTHER

- Search codebase for all TODO comments and fix them (need to upgrade better auth for one - https://github.com/better-auth/better-auth/issues/3686)
- Debug why first stripe invocation causes SST proxy to die on Windows (could be related to below issue) - https://github.com/sst/sst/issues/6051
- When pushing final starter: Remove posthog settings from config / comment out the axiom secret / comment out the langfuse secrets / comment out the loops secret / remove loops setting from config / comment out stripe plugin in backend AND frontend / comment out stripe secrets / remove stripe publishable key from config / comment out stripe auth plugin in backend

## MINOR IMPROVEMENTS

- Remove the patch we applied to the AI SDK after this PR is addressed: https://github.com/vercel/ai/issues/9593
- Upgrade SST to see if it improves windows support (like hot reloading backend when modifying packages outside the backend)
- Potentially remove separate authConfig after issue is resolved - https://github.com/better-auth/better-auth/issues/3408
- Try pglite with backend tests whenever the prisma adapter works better
- If biome enables global detection through .d.ts files, we can remove our overrides
- Expand biome ruleset as it evolves
