# @repo/constants

Shared constants (plans, etc) used across apps.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Usage](#usage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

- Centralized, versioned constants for business logic
- Importable from both web and backend

## Usage

```ts
import { plans } from '@repo/constants';

const current = plans.free;
```
