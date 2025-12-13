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

## POSTHOG LOGS

- See if we can deprecate axiom in favor of posthog logs

## OTHER

- Try to upgrade prisma and see how they handle the direct url (once better documented). The vscode extension currently complains about our prisma schema file being out of date.
- Ensure that SST mono mode kills NextJS ports after web e2e test (keeping port active after run)
- Debug why first stripe invocation causes SST proxy to die on Windows (could be related to below issue) - https://github.com/sst/sst/issues/6051
- When pushing final starter: Remove posthog settings from config / comment out the axiom secret / comment out the langfuse secrets / comment out the loops secret / remove loops setting from config / comment out stripe plugin in backend AND frontend / comment out stripe secrets / remove stripe publishable key from config / comment out stripe auth plugin in backend

## SST V2 MIGRATION

- Fix and possibly drop the cloud-resources/index file depending on how it generates the types
- Figure out the command to install sst dependencies in CI during setup (bun sst install??)
- See if we need CORS
- Try adding node-version: "24" with double quotes to the ci.yml file and confirm it doesn't change to single quotes on Mac (if so, we need to fix the formatter on windows)
- Remove sst-env.d.ts and any references to it? Possibly disable some ts-ignores that aren't needed anymore?
- Remove fancy CI initialization logic if possible
- See if web needs to have bind to access api url
- See if api needs to have bind to access web url (for redirects?)
- Verify that the e2e tests work now
- Verify old tests work (especially in CI)
- Verify init still works as expected (docs, uncommented, and secret setting especially)
- See if AI works without bedrock and marketplace permissions
- Figure out how to support basic auth on the dev / staging sites again
- Verify source maps still work

## MINOR IMPROVEMENTS

- Disable autoplay of storybook stories when supported: https://github.com/storybookjs/storybook/discussions/25011
- Remove the patch we applied to the AI SDK after this PR is addressed: https://github.com/vercel/ai/issues/9593
- Upgrade SST to see if it improves windows support (like hot reloading backend when modifying packages outside the backend)
- Potentially remove separate authConfig after issue is resolved - https://github.com/better-auth/better-auth/issues/3408
- Try pglite with backend tests whenever the prisma adapter works better
  - If pglite works well, we can probably use it as a shadow DB rather than relying on Docker
- If biome enables global detection through .d.ts files, we can remove our overrides
- Expand biome ruleset as it evolves
