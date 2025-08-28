# @repo/analytics

Typed analytics utilities integrated with [PostHog](https://posthog.com/) for web and backend events.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Structure](#structure)
- [Usage](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- Unified identify/track APIs with strong typing via `events.ts`
- Web and server implementations: `analytics.web.ts` and `analytics.ts`
- Supports error capturing

## Structure

- `events.ts`: Typed event definitions and helpers
- `analytics.ts`: Node/server implementation
- `analytics.web.ts`: Browser implementation

## Usage

```ts
import { analytics } from '@repo/analytics';

await analytics.identify({ userId: 'u_123', traits: { email: 'a@b.com' } });
await analytics.userSignedIn();
```
