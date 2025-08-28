# Storybook

Storybook documents and tests our design system components in isolation. It uses the Next.js + Vite framework preset and includes accessibility, docs, themes, and Vitest integration.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Running Locally](#running-locally)
- [Design System Usage](#design-system-usage)
- [Writing Stories](#writing-stories)
- [Testing in Storybook](#testing-in-storybook)
- [Static Build](#static-build)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- Framework: `@storybook/nextjs-vite` with Vite
- Addons: Docs, A11y, Themes, Vitest, Chromatic (optional)
- Theming: Light/Dark via className and `ThemeProvider` from `@repo/design`
- Purpose: Develop, document, and manually test `@repo/design` components

## Directory Structure

```text
apps/storybook/
├── .storybook/          # Storybook configuration
│   ├── main.ts          # Stories, addons, framework, TS/props extraction
│   └── preview.tsx      # Global parameters, decorators, ThemeProvider
├── stories/             # Component stories (MDX and CSF)
├── playwright.config.ts # E2E config (optional for visual/smoke)
└── package.json
```

## Running Locally

From the repo root:

```sh
pnpm storybook dev
```

## Design System Usage

Global styles are imported from `@repo/design/globals.css` and the `ThemeProvider` is applied via a decorator in `preview.tsx`. This ensures components render with the same tokens, Tailwind v4 configuration, and themes used in the app.

## Writing Stories

- Place stories under `stories/` as `*.stories.tsx` (CSF) or `*.mdx`.
- Export a default with `title`, `component`, and optionally `args`/`argTypes`.
- Use controls (args) to surface interactive props; actions auto-bind `on*` handlers.
- Prefer small, focused stories that demonstrate states, variants, and accessibility patterns.

Example (CSF):

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@repo/design';

const meta: Meta<typeof Button> = {
  title: 'Design/Button',
  component: Button,
};
export default meta;

export const Primary: StoryObj<typeof Button> = {
  args: { variant: 'default', children: 'Click me' },
};
```

## Testing in Storybook

- Unit tests can run with Vitest (addon included) if you colocate tests.
- For visual/regression or smoke checks, you can run Playwright against the built Storybook or use Chromatic.

Run unit tests:

```sh
pnpm storybook test
pnpm storybook test:ui
```

## Static Build

Build a static Storybook for publishing or CI previews:

```sh
pnpm storybook build
```

The static build is output to `apps/storybook/storybook-static/`.
