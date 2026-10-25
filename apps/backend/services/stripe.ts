import { stripe as stripePlugin } from '@better-auth/stripe';
import { analytics } from '@repo/analytics';
import { config, env } from '@repo/config';
import { plans } from '@repo/constants';
import { Stripe } from 'stripe';

import { db } from '@/db';

/** Our Stripe client — undefined when Stripe is not configured */
export const stripe: Stripe | undefined = config.stripe.isEnabled
  ? new Stripe((env as Record<string, string>).STRIPE_SECRET_KEY)
  : undefined;

/** Stripe plugin instance — only defined when Stripe is configured */
export const stripePluginInstance = stripe
  ? stripePlugin({
      stripeClient: stripe,
      stripeWebhookSecret: (env as Record<string, string>).STRIPE_WEBHOOK_SECRET,
      // Ensure that stripe is attached to organizations rather than users
      organization: {
        enabled: true,
        // Ensure personal organizations use the owner's email
        getCustomerCreateParams: async (organization) => {
          const org = await db.organization.findUnique({
            where: { id: organization.id },
            select: {
              isPersonal: true,
              members: {
                where: { role: 'owner' },
                select: { user: { select: { email: true, name: true } } },
                take: 1,
              },
            },
          });

          const owner = org?.members[0];
          if (!owner) {
            return {};
          }

          return {
            ...(org?.isPersonal && { email: owner.user.email }),
          };
        },
      },
      // Configure stripe plans and events
      subscription: {
        enabled: true,
        plans: Object.values(plans).filter((plan) => !!plan.priceId),
        // Ensure that we validate whether a user can manage this organization's subscription
        authorizeReference: async ({ user, referenceId }) => {
          const member = await db.member.findFirst({
            where: { userId: user.id, organizationId: referenceId },
          });
          return member?.role === 'owner' || member?.role === 'admin';
        },
        // ---------- STRIPE HOOKS ----------
        // Fires when a subscription is created via normal checkout
        onSubscriptionComplete: async ({ subscription, plan }) => {
          await analytics.planChanged({
            userId: subscription.referenceId,
            organizationId: subscription.referenceId,
            plan: plan.name,
          });
        },
        // Fires when a subscription is created via the Stripe dashboard
        onSubscriptionCreated: async ({ subscription, plan }) => {
          await analytics.planChanged({
            userId: subscription.referenceId,
            organizationId: subscription.referenceId,
            plan: plan.name,
          });
        },
        // Fires when a subscription is updated
        onSubscriptionUpdate: async ({ subscription }) => {
          await analytics.planChanged({
            userId: subscription.referenceId,
            organizationId: subscription.referenceId,
            plan: subscription.plan,
          });
        },
        // Fires when a subscription is cancelled
        onSubscriptionCancel: async ({ subscription }) => {
          await analytics.planCancelled({
            userId: subscription.referenceId,
            organizationId: subscription.referenceId,
            plan: subscription.plan,
          });
        },
      },
      // Handle events not covered by the subscription hooks (e.g. one-time charges)
      onEvent: async (event) => {
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          // Only handle payment mode sessions — subscriptions are handled by the hooks above
          if (session.mode !== 'payment') {
            return;
          }
          // You can add your one-time charge logic here
        }
      },
    })
  : undefined;
