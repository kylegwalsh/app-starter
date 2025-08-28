# @repo/config

Shared runtime configuration and environment accessors for apps and packages.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Structure](#structure)
- [Usage](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- `config`: Globally accessible runtime configuration (safe to import in web and backend)
- `env`: Backend-only secrets sourced from SST (fully typed)

## Structure

- `config.ts`: Builds and exports `config` and `env` helpers
- `env/`: Environment helper modules (separated for web/backend as needed)
- `cloud-resources/`: Helpers that read values from SST outputs when available
- `index.ts`: Barrel exports

## Usage

When accessing general config:

```ts
import { config } from '@repo/config';

console.log(config.app.url);
```

When accessing secrets (only available on the backend):

```ts
import { env } from '@repo/config';

console.log(env.DATABASE_URL);
```
