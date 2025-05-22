# TODO

- Add testing framework to frontend
- Update the backend mocked router to have user context
- Add notes about testing framework and testing philosophy to README
- Add CI
- Try testing in CI to see if in memory DB is working
- Fix shadcn import aliases
- Confirm shadcn is correctly tree-shaken (since it's a local package and not a true package)
- Posthog error tracking + analytics
- Test crisp + analytics for crisp
  - Ensure posthog stuff is optional and that we don't run source map stuff if it's not set up
- Add better auth
  - Remove prisma settings model in favor of auth user model
  - Add auth provider setup to initialization script
  - Add auth provider mention to README
- Add stripe support and add to setup script (plugin for better auth)
- Remove posthog settings AND crisp chat settings from config when pushing final starter
- Maybe add an optional dashboard setup
- Cursor rules
