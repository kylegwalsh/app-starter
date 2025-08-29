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

## LANGFUSE

- Upgrade to latest langfuse (in stash)
- Ensure langfuse is using correct "environment" field
- Consider flushing langfuse locally to ensure testing traces appear with lcl environment
- Figure out how to reliably flush the Langfuse traces (shutting down SDK and forceFlushing don't seem to work)
- Try adding posthog LLM analytics

## OTHER

- Test migration logic in CI
- Debug why first stripe invocation causes SST proxy to die on Windows (could be related to below issue) - https://github.com/sst/sst/issues/6051
- When pushing final starter: Remove posthog settings from config / comment out the axiom secret / comment out the langfuse secrets / comment out the loops secret / remove loops setting from config / comment out stripe plugin in backend AND frontend / comment out stripe secrets / remove stripe publishable key from config / comment out stripe auth plugin in backend

## MINOR IMPROVEMENTS

- Maybe see if there's a reason turbo cache is missing in the CI (it seems like it should hit)
- Upgrade SST to see if it improves windows support (like hot reloading backend when modifying packages outside the backend)
- Search codebase for all TODO comments and fix them (need to upgrade better auth for one - https://github.com/better-auth/better-auth/issues/3686)
- Potentially remove separate authConfig after issue is resolved - https://github.com/better-auth/better-auth/issues/3408
- Try pglite with backend tests whenever the prisma adapter works better
