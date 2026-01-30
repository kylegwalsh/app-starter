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
- Remove weird log level thing we added for axiom (remove axiom as well)

## POSTHOG MESSAGING

- They are rolling out a new messaging system that will replace crisp

## VERCEL

- VERCEL DEV HAS ISSUES WITH THE TS VERSION -> I REMOVED GLOBAL VERCEL CLI AND THEN LINK STOPPED WORKING IN INIT
- Init
  - Prevent link from updating .gitignore and hiding our project.json
  - Confirm no init:existing changes are needed and that vercel dev works without the .env.local file
  - Update stripe manual webhook instructions after verifying how we can get the URL deploying locally
  - Determine if we need to run link every time an env variable changes (not ideal)
- CI
  - Pre-build and alias app
  - See if we need "CI" env var logic in CI and other fancy ci logic
  - Figure out how to handle optional apps (like docs) in an automated way (check for vercel project.json probably)
  - Verify old tests work (especially in CI)
  - Figure out how to handle e2e tests in CI
- Telemetry
  - Verify updates to log package actually write to vercels runtime logs as well
  - Replace telemetry vercel/otel and funnel to posthog and update Langfuse
  - Ensure the requestId is propagated correctly with vercel/otel (stays the same between requests)
- Other
  - Verify source maps still work
  - Modify initExisting to ensure the user has access to the referenced vercel project (store somewhere???)
  - Fix web and api url references now that we've deprecated the cloud-resources file (perhaps use https://vercel.com/docs/monorepos#define-related-projects)
  - Verify playwright still works
  - Ensure prisma works in the deployment
  - Add launch.json for vercel
  - See if we need CORS
  - Verify that the e2e tests still work and don't steal port
  - Figure out how to support basic auth on the dev / staging sites again
  - Modify the init method to ask what AI providers they would like to set up and get keys for OpenAI, Anthropic, and Google (checkboxes maybe?). Ensure the ai package doesn't crash when env vars are not provided.
  - Re-add pre-commit

## ORPC

- Move oRPC deps out of root package.json
- Remove all tRPC packages
- Try to get it working instead of tRPC

## OTHER

- Changing active organization should invalidate all requests
- Tell AI to use react-hook-form for all forms
- Tell AI that we use bun as the workspace manager
- Replace cursor rules with AGENTS.md / skills and test in cursor + claude
- Ensure starter supports sending invites
- Experiment with ox as a biome replacement
- Add route outputs to tRPC file for types
- Add new cursor rules to app starter
- Update button with loading state
- Login wrote password to url params???
- Experiment with Sherif as replacement to manypkg and add linting step to CI
- Collocate tests next to the files they test
- Ensure CI file is properly formatted on Windows and Mac (Windows doesn't seem to replace double quotes with single quotes)
- Try to upgrade prisma and see how they handle the direct url (once better documented). The vscode extension currently complains about our prisma schema file being out of date.
- When pushing final starter: Remove posthog settings from config / comment out the axiom secret / comment out the langfuse secrets / comment out the loops secret / remove project id / remove loops setting from config / comment out stripe plugin in backend AND frontend / comment out stripe secrets / remove stripe publishable key from config / comment out stripe auth plugin in backend

## MINOR IMPROVEMENTS

- Remove ts-node override after vercel CLI is updated to newer TS: https://github.com/vercel/vercel/issues/8680
- Disable autoplay of storybook stories when supported: https://github.com/storybookjs/storybook/discussions/25011
- Remove the patch we applied to the AI SDK after this PR is addressed: https://github.com/vercel/ai/issues/9593
- Upgrade SST to see if it improves windows support (like hot reloading backend when modifying packages outside the backend)
- Potentially remove separate authConfig after issue is resolved - https://github.com/better-auth/better-auth/issues/3408
- Try pglite with backend tests whenever the prisma adapter works better
- If biome enables global detection through .d.ts files, we can remove our overrides
- Expand biome ruleset as it evolves
