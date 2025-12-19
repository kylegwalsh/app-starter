# @repo/config

Shared runtime configuration for apps and packages.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Structure](#structure)
- [Usage](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- `config`: Globally accessible runtime configuration (safe to import in web and backend)

## Structure

- `config.ts`: Our app configuration

## Usage

When accessing general config:

```ts
import { config } from '@repo/config';

console.log(config.app.url);
```
