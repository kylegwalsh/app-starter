# TODO

- Ensure CI caches everything important (pnpm, node_modules, turbo, sst, next, playwright, etc)
- Do PostHog NextJS error setup (talks about error boundary, etc)
- Figure out if we need source map uploads for NextJS (maybe create a turbo command so that it runs for all necessary subrepos?)
- Figure out how to make SST not change path slashes in types files (or just don't commit them)
- Add seo meta data handler for next - https://github.com/search?q=repo%3Ahaydenbleasel%2Fnext-forge+createMetadata&type=code
- Add betterstack logging (create observability package and add error handling) - https://github.com/haydenbleasel/next-forge/tree/main/packages/observability
- Add AI util in backend
- Consider re-adding @storybook/addon-essentials if they upgrade to 9.0.1 (might be able to drop addon-docs after)
- Add CI
- Try testing in CI to see if in memory DB and playwright work (solve for SST calls in e2e tests)
- Posthog error tracking + analytics
- Consider implementing posthog feature flags
- Figure out how to handle page titles / seo stuff with next
- Test crisp + analytics for crisp
  - Ensure posthog stuff is optional and that we don't run source map stuff if it's not set up
- Add better auth
  - Remove prisma settings model in favor of auth user model
  - Add auth provider setup to initialization script
  - Add auth provider mention to README
- Update the backend mocked router to have user context (mirror output of better auth)
- Add stripe support and add to setup script (plugin for better auth)
- Remove posthog settings AND crisp chat settings from config when pushing final starter
- Add marketing site setup (get prompts / framework from Chad)
- Maybe add an optional dashboard setup
- Cursor rules

Minor Bugs:

- Fix storybook test button (vite isn't launching right) - seems like a bug with the node_module
