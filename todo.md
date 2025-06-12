# TODO

PostHog

- Do PostHog NextJS error setup (talks about error boundary, etc)
- Posthog error tracking + analytics
- Test crisp + analytics for crisp
  - Ensure posthog stuff is optional and that we don't run source map stuff if it's not set up
- Double check posthog source maps from CI
  - The CI also mentioned we were missing a project name (see if we need to set that up)
- Figure out if we need source map uploads for NextJS (maybe create a turbo command so that it runs for all necessary subrepos?)
- Swap the isEnabled boolean in the config to be isDeployment after testing

- Add betterstack logging (create observability package and add error handling) - https://github.com/haydenbleasel/next-forge/tree/main/packages/observability
- Add AI util in backend
- Figure out how to handle page titles / seo stuff with next
  - Add seo meta data handler for next - https://github.com/search?q=repo%3Ahaydenbleasel%2Fnext-forge+createMetadata&type=code
- Add better auth
  - Remove prisma settings model in favor of auth user model
  - Add auth provider setup to initialization script
  - Add auth provider mention to README
  - Test PostHog user signed up / out events (does it track and reset session / crisp?)
  - Test crisp + analytics for crisp
- Consider implementing posthog feature flags
- Update the backend mocked router to have user context (mirror output of better auth)
- Add stripe support and add to setup script (plugin for better auth)
- Add marketing site setup (get prompts / framework from Chad)
- Maybe add an optional dashboard setup
- Cursor rules
- Remove posthog settings AND crisp chat settings from config when pushing final starter

Minor Improvements:

- Fix storybook test button (vite isn't launching right) - seems like a bug with the node_module
- Consider re-adding @storybook/addon-essentials if they upgrade to 9.0.1 (might be able to drop addon-docs after)
- Maybe see if there's a reason turbo cache is missing in the CI (it seems like it should hit)
