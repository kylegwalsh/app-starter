# @repo/design

Shared design system: standardized components, Tailwind v4, theming, and global styles.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Structure](#structure)
- [Usage](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- Accessible, composable components (Radix/shadcn-based)
- Tailwind v4 pre-configured with global styles and CSS variables
- Theme support (light/dark) via `ThemeProvider`

## Structure

- `components/`: UI components
- `styles/`: Global CSS and tokens (`globals.css`)
- `hooks/`, `lib/`: Helpers and utilities

## Usage

```tsx
import '@repo/design/globals.css';
import { ThemeProvider, Button } from '@repo/design';

export default function App({ children }) {
  return (
    <ThemeProvider>
      <Button>Click</Button>
      {children}
    </ThemeProvider>
  );
}
```
