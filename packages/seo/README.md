# @repo/seo

SEO helpers for Next.js (App Router).

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Structure](#structure)
- [Usage](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- `createMetadata` helper for Next.js App Router
- JSON-LD components for common schema.org types

## Structure

- `metadata.ts`: Factory for `export const metadata` usage
- `json-ld.tsx`: React components to embed structured data

## Usage

```ts
import { createMetadata } from '@repo/seo';

export const metadata = createMetadata({
  title: 'My Page',
  description: 'SEO-friendly page',
});
```
