import { config, env } from '@repo/config';
import axios, { type AxiosResponse, isAxiosError } from 'axios';

// ---------- TYPES ----------
// The shapes below come from PostHog's API schema (https://us.posthog.com/api/schema/)

/** A transactional email send (`POST messaging_templates/:id/send/`) */
type SendTransactionalEmail = {
  /** The recipient's email address */
  to: string;
  /** Who the email is for, so its events land on their person (defaults to `to`) */
  identifiers?: { distinct_id?: string };
  /** The template's `{{ variables.* }}` */
  message_data: Record<string, string>;
};

/** PostHog's response once the email is queued */
type SendTransactionalEmailResponse = {
  /** The queued send's ID */
  message_id: string;
  /** True when an earlier request with the same Idempotency-Key already queued this email */
  replayed: boolean;
};

/** PostHog's error body (e.g. 400 for a template that isn't transactional, 429 when over quota) */
type PosthogApiError = { type: string; code: string; detail: string; attr: string | null };

// ---------- METHODS ----------
const POSTHOG_SECRET_KEY = (env as Record<string, string>).POSTHOG_SECRET_KEY;

/** Client for our PostHog project's API (only initialized if PostHog emails are set up) */
export const posthog =
  POSTHOG_SECRET_KEY && config.posthog.projectId
    ? axios.create({
        baseURL: `https://us.posthog.com/api/projects/${config.posthog.projectId}/`,
        headers: { Authorization: `Bearer ${(env as Record<string, string>).POSTHOG_SECRET_KEY}` },
      })
    : undefined;

/** Sends a transactional email from a PostHog template, returning the queued send */
export const sendTransactionalEmail = async ({
  templateId,
  ...email
}: SendTransactionalEmail & { templateId: string }) => {
  if (!posthog) {
    throw new Error(
      "Emails aren't set up (POSTHOG_SECRET_KEY or the project ID is missing). Run: bun run init:email",
    );
  }

  try {
    const { data } = await posthog.post<
      SendTransactionalEmailResponse,
      AxiosResponse<SendTransactionalEmailResponse>,
      SendTransactionalEmail
    >(`messaging_templates/${templateId}/send/`, email);
    return {
      messageId: data.message_id,
      replayed: data.replayed,
    };
  } catch (error) {
    // PostHog explains the failure (e.g. an unverified sending domain or a missing scope)
    if (isAxiosError<PosthogApiError>(error) && error.response) {
      const { status, data } = error.response;
      throw new Error(`PostHog couldn't send the email (${status} ${data.code}): ${data.detail}`);
    }
    throw error;
  }
};
