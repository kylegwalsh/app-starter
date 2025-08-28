# @repo/tsconfig

Shared TypeScript configurations for the monorepo.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Structure](#structure)
- [Usage](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- Base TS configs for Node, React, and Next.js apps
- Centralizes strictness, module resolution, and path aliases

## Structure

- `base.json`: Common tsconfig base
- `react.json`: React app presets
- `nextjs.json`: Next.js app presets

## Usage

Extend in your `tsconfig.json`:

```json
{
  "extends": "@repo/tsconfig/react.json",
  "compilerOptions": {
    "baseUrl": "."
  }
}
```
