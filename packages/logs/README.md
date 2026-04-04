# @repo/logs

Pino-based logging with request metadata helpers and pretty output locally. In production, logs are shipped to PostHog via OpenTelemetry (and CloudWatch) for centralized logging.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Structure](#structure)
- [Usage](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- Backend-only usage (consumed by serverless backend services)
- Ships production logs to PostHog via OpenTelemetry (and CloudWatch)
- Helpers to add Lambda request context and additional metadata

## Structure

- `log.ts`: Logging utilities

## Usage

```ts
import { log, addLogMetadata } from '@repo/logs';

addLogMetadata({ request: { path: '/api/health', method: 'GET' } });
log.info('Hello');
log.error({ err }, 'Something failed');
```
