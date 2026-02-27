---
name: add-env
description: Add a new secret/environment variable to both dev and prod environments. Use when adding new API keys, secrets, or env vars.
argument-hint: '<SECRET_NAME> <dev-value> <prod-value>'
disable-model-invocation: true
allowed-tools: Bash(bun backend env:add *), Edit(infra/secrets.ts)
---

Add a secret to both dev and prod environments and register it in infra.

## Steps

1. Run `bun backend env:add $0 "$1" "$2"` to add the secret to both environments
2. Add the export to `infra/secrets.ts`: `export const $0 = new sst.Secret('$0');`
3. The user will need to restart the backend server to pick up the new secret
