# @repo/email

Transactional emails (password resets, invitations, and contact form messages), sent through PostHog.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Structure](#structure)
- [Setup](#setup)
- [Usage](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- Emails are PostHog email templates, sent through PostHog's transactional email API
- `config.posthog.email.templates` maps each email the app sends to its PostHog template ID
- `templates/` holds starter designs that `bun run init` (and `bun run init:email`) uploads, so new projects have working emails on day one (after that, edit them in PostHog)
- To add an email, build it in PostHog, add its ID to config, and add a send helper

## Structure

- `email.ts`: Send helpers (`sendResetPasswordEmail`, `sendInvitationEmail`, etc)
- `posthog.ts`: The PostHog API client emails are sent through
- `templates/`: The starter templates `bun run init` uploads

## Setup

`bun run init` sets emails up, and `bun run init:email` re-runs it (e.g. once you have a domain). For each PostHog project (dev and prod) it:

1. Finds the project's email sender, or walks you through adding one in PostHog
2. Uploads the starter templates and saves their IDs to config
3. Creates a project secret key that can only send emails

Emails only send once the sender's domain is verified in PostHog (Workflows → Channels). New projects can send 50 emails an hour and 100 a day at first.

## Usage

```ts
import { email } from '@repo/email';

await email.sendResetPasswordEmail({
  email: 'a@b.com',
  resetLink: 'https://app/reset?token=...',
});
```

Notes:

- Automated campaigns (like onboarding emails) live entirely in PostHog Workflows, triggered by analytics events such as `User Signed Up` (see `@repo/analytics`), so they need no code here.
