# @repo/flags

Feature flags powered by PostHog for gradual roll-outs, cohort/user/org targeting, and experiments.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Usage](#usage)
  - [Hooks](#hooks)
    - [`useFeatureFlagEnabled`](#usefeatureflagenabled)
    - [`useFeatureFlagVariantKey`](#usefeatureflagvariantkey)
    - [`useActiveFeatureFlags`](#useactivefeatureflags)
  - [Components](#components)
    - [`FeatureFlagged`](#featureflagged)
- [Manage Flags](#manage-flags)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Overview

Create and manage feature flags in PostHog, then use them in-app to enable/disable functionality for specific cohorts, users, organizations, or rollout percentages. Ideal for safely rolling out features and running experiments.

Flags are automatically evaluated by the PostHog SDK for the currently identified user/session. Once a user is identified, the SDK fetches and caches enabled flags and updates them as targeting changes.

## Usage

You can use hooks or components to conditionally render content based on feature flags.

### Hooks

There are several hooks for working with feature flags in PostHog depending on the type of flag you're working with.

#### `useFeatureFlagEnabled`

Returns a boolean indicating whether the feature flag is enabled.

```tsx
import { useFeatureFlag } from '@repo/flags';

export const Dashboard = () => {
  const enabled = useFeatureFlagEnabled('new-feature');

  if (!enabled) return null;
  return <a href="/new-feature">Try the new feature</a>;
};
```

#### `useFeatureFlagVariantKey`

Returns a string indicating the active variant of the feature flag.

```tsx
import { useFeatureFlagVariantKey } from '@repo/flags';

export const Dashboard = () => {
  const variant = useFeatureFlagVariantKey('new-feature');

  return <div>You are in variant {variant}</div>;
};
```

#### `useActiveFeatureFlags`

Returns an array of strings indicating the active feature flags.

```tsx
import { useActiveFeatureFlags } from '@repo/flags';

export const Dashboard = () => {
  const flags = useActiveFeatureFlags();

  return <div>You have the following flags active: {flags.join(', ')}</div>;
};
```

### Components

There is currently one component that allows you to conditionally render content based on a feature flag.

#### `FeatureFlagged`

Renders a children or fallback content based on a feature flag.

```tsx
import { FeatureFlagged } from '@repo/flags';

export const DashboardCTA = () => {
  return (
    <FeatureFlagged flag="new-cta" match={true} fallback={<button>Old Copy</button>}>
      <button>New Copy</button>
    </FeatureFlagged>
  );
};
```

## Manage Flags

Configure and target flags in PostHog:

- URL: https://app.posthog.com/feature_flags
- Target by cohorts, users, organizations, or percentage roll-outs
- Attach experiments and measure impact with PostHog analytics
