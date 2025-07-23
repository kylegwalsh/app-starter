# TODO

- Fix error where it says "web" is not linked to keep-database-awake.handler (best to ignore it)
- Add organization plugin to better auth
- Add stripe support and add to setup script (plugin for better auth)
- Test migration logic in CI
- Maybe add an optional dashboard setup
- Consider implementing posthog feature flags
- Cursor rules
- Add marketing site setup (get prompts / framework from Chad)
- Figure out how to reliably flush the Langfuse traces (shutting down SDK and forceFlushing don't seem to work)
- When pushing final starter: Remove posthog settings from config / comment out the axiom secret / comment out the langfuse secrets / comment out the loops secret / remove loops setting from config
- Lock packages to a certain version in package.json's
- Add README's to all packages / apps

Minor Improvements:

- Fix storybook test button (vite isn't launching right) - seems like a bug with the node_module
- Consider re-adding @storybook/addon-essentials if they upgrade to 9.0.1 (might be able to drop addon-docs after)
- Maybe see if there's a reason turbo cache is missing in the CI (it seems like it should hit)
- If axiom fixes their API, we can remove the extra "severity" field we're sending
- Upgrade SST to see if it improves windows support (like hot reloading backend when modifying packages outside the backend)
- Fix unmet peer dependencies when installing
- Consider finding a way to exclude playwright install from postinstall to speed up installs (handle in CI too)
