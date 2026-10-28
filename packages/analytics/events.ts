import { config } from '@repo/config';
import type { getLogMetadata as getLogMetadataMethod, log as logMethod } from '@repo/logs';
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
  getLogMetadata?: undefined;
};

/** Platform-specific properties for backend analytics */
type BackendAnalyticsProps = SharedAnalyticsProps & {
  platformAnalytics: PostHogBackend;
  platform: 'backend';
  log?: typeof logMethod;
  getLogMetadata?: typeof getLogMetadataMethod;
};

/** Backend events require additional parameters */
type BackendEventProps = {
  /** The user's ID */
  userId: string;
  /** The organization's ID */
  organizationId: string;
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

/** The properties for the organization identify event */
type OrganizationIdentifyEvent = {
  /** The id of the organization */
  organizationId: string;
  /** Any additional traits to associate with the organization */
  traits?: {
    /** The organization's name */
    name?: string;
    /** When the organization was created */
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
      if (config.posthog.analytics.isEnabled && config.posthog.analytics.apiKey) {
        await func();
      }
    } catch (error) {
      // Catch any errors
      log.error({ err: error }, '[analytics] Error invoking analytics');
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
      : BackendEventProps & Record<string, unknown>,
  ) => {
    // Track the event differently based on platform
    switch (platform) {
      case 'backend': {
        const { userId, organizationId, ...restProperties } = properties as BackendEventProps &
          Record<string, unknown>;

        platformAnalytics.capture({
          distinctId: userId,
          event,
          properties: restProperties,
          groups: {
            organization: organizationId,
          },
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
          await platformAnalytics.flush();
        });
      }
    },
    /** Identifies the user after sign in */
    identify: async ({ userId, traits }: IdentifyEvent) => {
      log.info('[analytics] Event: Identify', userId, traits);

      // Standardize their traits a little bit
      try {
        // Build first and last name from full name
        if (traits?.name) {
          const nameArray = traits.name.split(' ');
          if (nameArray.length >= 1) {
            traits.firstName = nameArray.splice(0, 1).join(' ');
          }
          if (nameArray.length >= 2) {
            traits.firstName = nameArray.splice(1).join(' ');
          }
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
        if (traits?.email) {
          traits.email = traits.email.toLowerCase();
        }
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
          log.error({ err: error }, '[analytics] Error on identify');
        }
      });
    },
    /** Track when the user signs out */
    userSignedOut: async (
      properties: EventProps<
        T,
        {
          /** Whether the session expired or not (they could have logged out manually) */
          sessionExpired?: boolean;
        }
      >,
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
        Analytics.reset();
      });

      // If the platform defined an onSignOut function, run it
      try {
        onSignOut?.();
      } catch {
        // Do nothing
      }
    },
    /** Track when the user signs in */
    userSignedIn: async (properties: EventProps<T>) => {
      log.info('[analytics] Event: User Signed In', {
        category: 'User',
        ...properties,
      });

      await safeInvoke(() =>
        track('User Signed In', {
          ...properties,
          category: 'User',
        }),
      );
    },
    /** Track when the user signs up */
    userSignedUp: async (
      properties: EventProps<
        T,
        {
          /** The user's email address */
          email: string;
          /** The user's name */
          name: string;
        }
      >,
    ) => {
      log.info('[analytics] Event: User Signed Up', {
        category: 'User',
        ...properties,
      });
      await safeInvoke(() => {
        track('User Signed Up', {
          ...properties,
          category: 'User',
        });
      });
    },
    /** Track when a new organization is created */
    organizationCreated: async (
      properties: EventProps<
        T,
        {
          /** The organization's id */
          organizationId: string;
          /** The organization's name */
          name: string;
        }
      >,
    ) => {
      log.info('[analytics] Event: Organization Created', {
        ...properties,
        category: 'Organization',
      });
      await safeInvoke(() => {
        track('Organization Created', {
          category: 'Organization',
          ...properties,
        });
      });
    },
    /** Identifies and creates the organization (if it doesn't exist) */
    organizationIdentify: async ({ organizationId, traits }: OrganizationIdentifyEvent) => {
      log.info('[analytics] Event: Organization Identify', organizationId, traits);
      await safeInvoke(() => {
        // Track the event differently based on platform
        switch (platform) {
          case 'backend': {
            platformAnalytics.groupIdentify({
              groupType: 'organization',
              groupKey: organizationId,
              properties: {
                ...traits,
              },
            });
            break;
          }
          case 'web': {
            platformAnalytics.group('organization', organizationId, traits);
            break;
          }
          default: {
            throw new Error('You forgot to define platform in when initializing analytics');
          }
        }
      });
    },
    /** Track when a plan is changed (upgraded or switched) */
    planChanged: async (
      properties: EventProps<
        T,
        {
          /** The plan the user changed to */
          plan: string;
        }
      >,
    ) => {
      log.info('[analytics] Event: Plan Changed', {
        category: 'Billing',
        ...properties,
      });
      await safeInvoke(() => {
        track('Plan Changed', {
          category: 'Billing',
          ...properties,
        });
      });
    },
    /** Track when a plan is cancelled */
    planCancelled: async (
      properties: EventProps<
        T,
        {
          /** The plan the user was on before cancellation */
          plan: string;
        }
      >,
    ) => {
      log.info('[analytics] Event: Plan Cancelled', {
        category: 'Billing',
        ...properties,
      });
      await safeInvoke(() => {
        track('Plan Cancelled', {
          category: 'Billing',
          ...properties,
        });
      });
    },
    /** Track when the user sends a chat message */
    chatMessageSent: async (
      properties: EventProps<
        T,
        {
          /** The conversation the message was sent to */
          conversationId: string;
          /** Whether this message started the conversation */
          isNewConversation: boolean;
          /** Whether this send retries an earlier message (regenerating its response) */
          isRetry: boolean;
          /** How many files were attached to the message */
          attachmentCount: number;
          /** How many messages the conversation has, including this one */
          messageCount: number;
        }
      >,
    ) => {
      log.info('[analytics] Event: Chat Message Sent', {
        category: 'Chat',
        ...properties,
      });
      await safeInvoke(() => {
        track('Chat Message Sent', {
          category: 'Chat',
          ...properties,
        });
      });
    },
    /** Track feedback on an AI feature (a chat response, or our MCP tools) */
    feedbackSubmitted: async (
      properties: EventProps<
        T,
        | {
            /** A rating on a chat response */
            feature: 'chat';
            /** Thumbs up or down */
            rating: 'up' | 'down';
            /** The user's optional comment */
            comment?: string;
            /** The Langfuse trace of the rated AI response */
            traceId?: string;
          }
        | {
            /** Feedback an MCP client sent about our tools */
            feature: 'mcp';
            /** What kind of feedback it is */
            feedbackType: 'bug' | 'feature-request' | 'workflow-friction' | 'praise';
            /** What happened, and what would have made it better */
            comment: string;
            /** The tool the feedback is about */
            toolName?: string;
          }
      >,
    ) => {
      log.info('[analytics] Event: Feedback Submitted', {
        category: 'Feedback',
        ...properties,
      });
      await safeInvoke(() => {
        track('Feedback Submitted', {
          category: 'Feedback',
          ...properties,
        });
      });
    },
    /** Track when an MCP client connects (completes the initialize handshake) */
    mcpClientConnected: async (
      properties: EventProps<
        T,
        {
          /** The new MCP session */
          sessionId: string;
          /** The client's self-reported name (e.g. "claude-ai", "cursor") */
          clientName?: string;
          /** The client's self-reported version */
          clientVersion?: string;
        }
      >,
    ) => {
      log.info('[analytics] Event: MCP Client Connected', {
        category: 'MCP',
        ...properties,
      });
      await safeInvoke(() => {
        track('MCP Client Connected', {
          category: 'MCP',
          ...properties,
        });
      });
    },
    /** Track when an MCP client calls one of our tools */
    mcpToolCalled: async (
      properties: EventProps<
        T,
        {
          /** The tool that was called */
          toolName: string;
          /** The MCP session the call was made in */
          sessionId?: string;
          /** Whether the tool succeeded (failures are returned to the client as error results) */
          success: boolean;
          /** On failure, its HTTP-style status: 4xx means the caller's input was wrong, 5xx means the tool broke */
          errorStatus?: number;
          /** How long the tool took to run */
          durationMs: number;
        }
      >,
    ) => {
      log.info('[analytics] Event: MCP Tool Called', {
        category: 'MCP',
        ...properties,
      });
      await safeInvoke(() => {
        track('MCP Tool Called', {
          category: 'MCP',
          ...properties,
        });
      });
    },
    /** Reset the analytics when the user signs out */
    reset: async () => {
      log.info('[analytics] Resetting user');
      await safeInvoke(() => {
        if ('reset' in platformAnalytics) {
          platformAnalytics.reset();
        }
      });
    },
    /** Capture an error */
    captureException: async (
      error: unknown,
      /** Any additional properties to attach to the error */
      properties?: Record<string, unknown>,
    ) => {
      log.error(
        { ...properties, err: error },
        error instanceof Error ? error.message : 'Unknown error',
      );

      await safeInvoke(() => {
        // Track the error differently based on platform
        if (platform === 'backend') {
          const { awsRequestId, userId, request } = getLogMetadata?.() ?? {};
          platformAnalytics.captureException(error, userId as string, {
            awsRequestId,
            path: request?.path,
            method: request?.method,
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
