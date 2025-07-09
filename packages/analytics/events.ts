import { config } from '@repo/config';
import type { flushLogs, getLogMetadata, log } from '@repo/logs';
import { time } from '@repo/utils';
import type { PostHog as PostHogWeb } from 'posthog-js';
import type { PostHog as PostHogBackend } from 'posthog-node';

/** Shared properties for both web and backend analytics */
type SharedAnalyticsProps = {
  onIdentify?: (props: IdentifyEvent) => void;
  onSignOut?: () => void;
};

/** Platform-specific properties for web analytics */
type WebAnalyticsProps = SharedAnalyticsProps & {
  platformAnalytics: PostHogWeb;
  platform: 'web';
  log?: typeof console;
  flushLogs?: undefined;
  getLogMetadata?: undefined;
};

/** Platform-specific properties for backend analytics */
type BackendAnalyticsProps = SharedAnalyticsProps & {
  platformAnalytics: PostHogBackend;
  platform: 'backend';
  log?: typeof log;
  flushLogs?: typeof flushLogs;
  getLogMetadata?: typeof getLogMetadata;
};

/** Backend events require additional parameters */
type BackendEventProps = {
  /** The user's ID */
  userId: string;
  /** Some optional additional context that can help with matching users in third party platforms */
  context?: {
    /** The user's traits */
    traits?: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
    };
  };
};

/** Helper type for event properties based on platform */
type EventProps<
  T extends 'web' | 'backend',
  P extends Record<string, unknown> = Record<string, never>,
> = T extends 'web'
  ? P
  : P extends Record<string, never>
    ? BackendEventProps
    : BackendEventProps & P;

/** The properties for the identify event */
type IdentifyEvent = {
  /** The id of the user */
  userId: string;
  /** Any additional traits to associate with the user */
  traits?: {
    /** The optional mailing address of the user */
    address?:
      | {
          /** The user's city */
          city?: string;
          /** The user's country */
          country?: string;
          /** The user's zip code */
          postalCode?: number;
          /** The user's state */
          state?: string;
          /** The user's street address */
          street?: string;
        }
      | string;
    /** The user's email address */
    email?: string;
    /** The users' name */
    name?: string;
    /** The user's first name */
    firstName?: string;
    /** The user's last name */
    lastName?: string;
    /** The user's phone number */
    phoneNumber?: string;
    /** When the user was created */
    createdAt?: Date | string | number;
  };
};

/**
 * Extends an analytics library and returns a list of available events
 * @param analytics - The analytics library being extended (must be a Segment library)
 */
export const createAnalyticsEvents = <T extends 'web' | 'backend'>({
  platformAnalytics,
  platform,
  onIdentify,
  onSignOut,
  log = console,
  flushLogs,
  getLogMetadata,
}: // Ensure our posthog library is typed correctly based on platform
T extends 'web' ? WebAnalyticsProps : BackendAnalyticsProps) => {
  /**
   * Safely invoke analytics functions (without crashing anything)
   * @param func - Function to invoke
   */
  const safeInvoke = async (func: () => Promise<void> | void) => {
    try {
      // Only send analytics events if posthog is enabled
      if (config.posthog.isEnabled && config.posthog.apiKey) {
        await func();
      }
    } catch (error) {
      // Catch any errors
      log.error({ error }, '[analytics] Error invoking analytics');
    }
  };

  /**
   * A generic track method that determines the correct way to format the track call based on platform
   * @param event - The name of the event we're sending
   * @param properties - The additional properties to attach to the event
   */
  const track = (
    event: string,
    properties: T extends 'web'
      ? Record<string, unknown>
      : BackendEventProps & Record<string, unknown>
  ) => {
    // Track the event differently based on platform
    switch (platform) {
      case 'backend': {
        const { userId, ...restProperties } = properties as BackendEventProps &
          Record<string, unknown>;

        platformAnalytics.capture({
          distinctId: userId,
          event,
          properties: restProperties,
        });

        break;
      }
      case 'web': {
        platformAnalytics.capture(event, properties);
        break;
      }
      default: {
        throw new Error('You forgot to define platform in when initializing analytics');
      }
    }
  };

  /** Contains all our analytics events */
  const Analytics = {
    /** Flush the analytics events to the platform */
    flush: async () => {
      // It only does anything for backend
      if (platform === 'backend') {
        await safeInvoke(async () => {
          await Promise.all([
            platformAnalytics.flush(),
            // Analytics needs to flush logs separately (it seems like this instance of logs doesn't flush with the normal one)
            flushLogs?.(),
          ]);
        });
      }
    },
    /** Track when the user signs out */
    userSignedOut: async (
      properties: EventProps<
        T,
        {
          /** Whether the session expired or not (they could have logged out manually) */
          sessionExpired?: boolean;
        }
      >
    ) => {
      log.info('[analytics] Event: User Signed Out', {
        category: 'User',
        ...properties,
      });
      await safeInvoke(async () => {
        // Track the actual event
        track('User Signed Out', {
          ...properties,
          category: 'User',
        });
        // We must leave a gap between the sign out and reset methods
        // otherwise, it doesn't remove the anonymous ID
        await time.wait(500);
        // Reset the analytics
        void Analytics.reset();
      });

      // If the platform defined an onSignOut function, run it
      try {
        onSignOut?.();
      } catch {}
    },
    /** Track when the user signs in */
    userSignedIn: async (properties: EventProps<T>) => {
      log.info('[analytics] Event: User Signed In', { category: 'User', ...properties });

      await safeInvoke(() =>
        track('User Signed In', {
          ...properties,
          category: 'User',
        })
      );
    },
    /** Track when the user signs up */
    userSignedUp: async (
      properties: EventProps<
        T,
        {
          /** The user's email address */
          email: string;
        }
      >
    ) => {
      log.info('[analytics] Event: User Signed Up', { category: 'User', ...properties });
      await safeInvoke(() => {
        track('User Signed Up', {
          ...properties,
          category: 'User',
        });
      });
    },
    /** Identifies the user after sign in */
    identify: async ({ userId, traits }: IdentifyEvent) => {
      log.info('[analytics] Event: Identify', userId, traits);

      // Standardize their traits a little bit
      try {
        // Build first and last name from full name
        if (traits?.name) {
          const nameArray = traits.name.split(' ');
          if (nameArray.length >= 1) traits.firstName = nameArray.splice(0, 1).join(' ');
          if (nameArray.length >= 2) traits.firstName = nameArray.splice(1).join(' ');
        }
        // Build full name from first and last name
        else if (traits?.firstName || traits?.lastName) {
          traits.name = `${traits?.firstName ?? ''}${
            traits?.firstName && traits?.lastName ? ' ' : ''
          }${traits?.lastName ?? ''}`;
        }
      } catch {
        console.warn('[analytics] Error building names');
      }

      await safeInvoke(() => {
        // Make sure that all the emails are lower cased when being added in identify
        if (traits?.email) traits.email = traits.email.toLowerCase();
        // Track the event differently based on platform
        switch (platform) {
          case 'backend': {
            platformAnalytics.identify({
              distinctId: userId,
              properties: traits,
            });
            break;
          }
          case 'web': {
            platformAnalytics.identify(userId, traits);
            break;
          }
          default: {
            throw new Error('You forgot to define platform in when initializing analytics');
          }
        }

        // If the platform defined an onIdentify function, run it
        try {
          onIdentify?.({ userId, traits });
        } catch (error) {
          log.error({ error }, '[analytics] Error on identify');
        }
      });
    },
    /** Reset the analytics when the user signs out */
    reset: async () => {
      log.info('[analytics] Resetting user');
      await safeInvoke(() => {
        if ('reset' in platformAnalytics) platformAnalytics.reset();
      });
    },
    /** Capture an error */
    captureException: async (
      error: unknown,
      /** Any additional properties to attach to the error */
      properties?: Record<string, unknown>
    ) => {
      log.error(error);

      await safeInvoke(() => {
        // Track the error differently based on platform
        if (platform === 'backend') {
          const { awsRequestId, userId, langfuseTraceId, request } = getLogMetadata?.() ?? {};
          platformAnalytics.captureException(error, userId as string, {
            awsRequestId,
            langfuseTraceId,
            request,
            ...properties,
          });
        } else if (platform === 'web') {
          platformAnalytics.captureException(error, properties);
        }
      });
    },
  } as const;

  // Return the extended utility
  return Analytics;
};
