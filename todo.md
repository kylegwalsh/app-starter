# TODO

- Add stripe support
  - Add plugin for better auth
  - Add stripe to the setup script
    - Maybe comment out stripe client or ensure it doesn't run without env vars (like langfuse)
  - Create /settings/payments page
  - Add stripe to README
- Maybe add some react-form utils
- Test migration logic in CI
- Consider implementing posthog feature flags
- Decide on global state management (add it and a README mentioning it in the web app)
- Cursor rules
- Add marketing site setup (get prompts / framework from Chad)
- Figure out how to reliably flush the Langfuse traces (shutting down SDK and forceFlushing don't seem to work)
- Ensure langfuse is using correct "environment" field
- Consider flushing langfuse locally to ensure testing traces appear with lcl environment
- When pushing final starter: Remove posthog settings from config / comment out the axiom secret / comment out the langfuse secrets / comment out the loops secret / remove loops setting from config / comment out stripe plugin in backend AND frontend / comment out stripe secrets / remove stripe publishable key from config / comment out stripe auth plugin in backend
- Lock packages to a certain version in package.json's
- Add README's to all packages / apps
- Figure out why auth function responds with 500 every once in a while?

Minor Improvements:

- Fix storybook test button (vite isn't launching right) - seems like a bug with the node_module
- Consider re-adding @storybook/addon-essentials if they upgrade to 9.0.1 (might be able to drop addon-docs after)
- Maybe see if there's a reason turbo cache is missing in the CI (it seems like it should hit)
- If axiom fixes their API, we can remove the extra "severity" field we're sending
- Upgrade SST to see if it improves windows support (like hot reloading backend when modifying packages outside the backend)
- Fix unmet peer dependencies when installing
- Consider finding a way to exclude playwright install from postinstall to speed up installs (handle in CI too)
- Potentially remove separate authConfig after issue is resolved - https://github.com/better-auth/better-auth/issues/3408
