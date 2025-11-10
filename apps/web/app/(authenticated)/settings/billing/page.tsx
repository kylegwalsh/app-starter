'use client';

import { SettingsCard } from '@daveyplate/better-auth-ui';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@repo/design';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { BillingHistory, DashboardLayout } from '@/components';
import { trpc } from '@/core';

/** The payment and billing settings page */
export default function BillingPage() {
  const { data, isLoading } = trpc.billing.getPortalUrl.useQuery();
  const { url } = data ?? {};

  return (
    <DashboardLayout
      className="px-0"
      description="Manage your payment settings and access billing information"
      title="Billing"
    >
      <div className="flex flex-col gap-6">
        <SettingsCard
          classNames={{
            base: 'md:flex-row md:flex-wrap md:items-center md:gap-x-2',
            header: 'md:basis-1/2 w-full',
            content: 'md:basis-1/2 md:flex md:justify-end w-full',
            footer: 'md:basis-full w-full',
          }}
          description="Update your payment method, billing email, and address."
          instructions="You’ll be redirected to Stripe to securely manage your payment details."
          title="Manage payment settings"
        >
          {isLoading ? (
            <Skeleton className="mx-6 h-9 w-48 md:ml-auto" />
          ) : (
            <Button asChild>
              <Link
                className="mx-6 md:ml-auto"
                href={url ?? ''}
                rel="noreferrer noopener"
                target="_blank"
              >
                Open billing portal <ExternalLink />
              </Link>
            </Button>
          )}
        </SettingsCard>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Billing history</CardTitle>
            <CardDescription>Your recent invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <BillingHistory />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
