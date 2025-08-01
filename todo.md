# TODO

- Change the organization switcher in the sidebar to point to the organization settings page (might need to open a PR)
- Add stripe support
  - Add plugin for better auth
  - Add stripe to the setup script
    - Use API to create webhook and store it in SST (for both environments - skip any that already exist in SST or ask if they want to create a new one)
    - Maybe comment out stripe client or ensure it doesn't run without env vars (like langfuse)
    - Ensure our final notes check prints about setting up stripe onboarding and re-running the stripe:init script
    - At bottom, include a note about setting up stripe plans in apps/backend/core/auth if they want to support subscriptions
  - Create /settings/payments page
  - Add stripe to README
- Maybe add some react-form utils
- Ensure langfuse is using correct "environment" field
- Test migration logic in CI
- Consider implementing posthog feature flags
- Decide on global state management (add it and a README mentioning it in the web app)
- Cursor rules
- Add marketing site setup (get prompts / framework from Chad)
- Figure out how to reliably flush the Langfuse traces (shutting down SDK and forceFlushing don't seem to work)
- When pushing final starter: Remove posthog settings from config / comment out the axiom secret / comment out the langfuse secrets / comment out the loops secret / remove loops setting from config / comment out stripe plugin in backend AND frontend / comment out stripe secret
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
