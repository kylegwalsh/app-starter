# TODO

- Fix backend source maps in PostHog
- Push link to logs + requestId into PostHog when an error occurs (easy log lookup)
- See if we need the --enable-source-maps flag + sourceMaps boolean in the sst.config.ts file
- Re-add isDeployment check to config
- Figure out how to handle page titles / seo stuff with next
  - Add seo meta data handler for next - https://github.com/search?q=repo%3Ahaydenbleasel%2Fnext-forge+createMetadata&type=code
- Add better auth
  - Remove prisma settings model in favor of auth user model
  - Add auth provider setup to initialization script
  - Add auth provider mention to README
  - Test PostHog user signed up / out events (does it track and reset session / crisp?)
  - Test crisp + analytics for crisp
  - Update the backend mocked router to have user context (mirror output of better auth)
- Add stripe support and add to setup script (plugin for better auth)
- Consider implementing posthog feature flags
- Add marketing site setup (get prompts / framework from Chad)
- Maybe add an optional dashboard setup
- Cursor rules
- Figure out how to reliably flush the Langfuse traces (shutting down SDK and forceFlushing don't seem to work)
- When pushing final starter: Remove posthog settings from config / crisp chat settings from config / comment out the axiom secret / comment out the langfuse secrets
- Lock packages to a certain version in package.json's
- Add README's to all packages / apps

Minor Improvements:

- Fix storybook test button (vite isn't launching right) - seems like a bug with the node_module
- Consider re-adding @storybook/addon-essentials if they upgrade to 9.0.1 (might be able to drop addon-docs after)
- Maybe see if there's a reason turbo cache is missing in the CI (it seems like it should hit)
- If axiom fixes their API, we can remove the extra "severity" field we're sending
- Upgrade SST to see if it improves windows support
