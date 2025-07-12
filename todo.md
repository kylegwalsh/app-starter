# TODO

- Fix linting of config file (can't reference window) - lint entire project
- Add scoring utils to Langfuse AI helper

- Introduce DB migrations + migration function (maybe remove database stuff from CI)
- Add migration verification to CI (new step?)

- Add better auth
  - Fix CORS issue and test auth screens
  - Test PostHog user signed up / out events (does it track and reset session / crisp?)
  - Test crisp + analytics for crisp
  - Update the backend mocked router to have user context (mirror output of better auth)
  - Add some kind of frontend for better auth (maybe host statically?)
- Add stripe support and add to setup script (plugin for better auth)
- Maybe add an optional dashboard setup
- Consider implementing posthog feature flags
- Cursor rules
- Add marketing site setup (get prompts / framework from Chad)
- Figure out how to reliably flush the Langfuse traces (shutting down SDK and forceFlushing don't seem to work)
- When pushing final starter: Remove posthog settings from config / crisp chat settings from config / comment out the axiom secret / comment out the langfuse secrets
- Lock packages to a certain version in package.json's
- Add README's to all packages / apps

Minor Improvements:

- Fix storybook test button (vite isn't launching right) - seems like a bug with the node_module
- Consider re-adding @storybook/addon-essentials if they upgrade to 9.0.1 (might be able to drop addon-docs after)
- Maybe see if there's a reason turbo cache is missing in the CI (it seems like it should hit)
- If axiom fixes their API, we can remove the extra "severity" field we're sending
- Upgrade SST to see if it improves windows support (like hot reloading backend when modifying packages outside the backend)
- Fix unmet peer dependencies when installing
