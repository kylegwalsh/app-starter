# @repo/email

Email helpers (Loops) for transactional emails.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Structure](#structure)
- [Usage](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- Templates live in Loops and messages are triggered from application code
- Optionally configure Loops flows in the Loops UI based on analytics events (via PostHog), e.g., sign-up/onboarding campaigns
- Simple functions to send password resets and other notifications

## Structure

- `email.ts`: Helper functions (e.g., `sendResetPasswordEmail`)

## Usage

```ts
import { email } from '@repo/email';

await email.sendResetPasswordEmail({
  email: 'a@b.com',
  resetLink: 'https://app/reset?token=...',
});
```

Notes:

- Automated campaigns can be orchestrated in Loops using PostHog-driven events (e.g., `User Signed Up`). Ensure relevant events are emitted from the app (see `@repo/analytics`).
