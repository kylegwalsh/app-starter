'use client';

import { OrganizationSwitcher as BaseOrganizationSwitcher } from '@daveyplate/better-auth-ui';
import { cn } from '@repo/design/lib/utils';
import type { ComponentProps } from 'react';

import { useUser } from '@/hooks';

const DEFAULT_TRIGGER_BASE =
  'w-full bg-background text-foreground shadow-md hover:bg-background hover:bg-background/30 dark:hover:bg-background/60 group-data-[collapsible=icon]:!bg-transparent group-data-[collapsible=icon]:!shadow-none group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:[&>svg]:hidden';

/** Organization switcher with shared configuration for hiding personal org details */
export const OrganizationSwitcher = ({
  classNames,
  ...props
}: ComponentProps<typeof BaseOrganizationSwitcher>) => {
  const { organization } = useUser();

  return (
    <BaseOrganizationSwitcher
      classNames={{
        ...classNames,
        trigger: {
          ...classNames?.trigger,
          base: cn(DEFAULT_TRIGGER_BASE, classNames?.trigger?.base),
          user: {
            ...classNames?.trigger?.user,
            content: cn('group-data-[collapsible=icon]:hidden', classNames?.trigger?.user?.content),
            title: cn('group-data-[collapsible=icon]:hidden', classNames?.trigger?.user?.title),
            subtitle: cn(
              'group-data-[collapsible=icon]:hidden',
              classNames?.trigger?.user?.subtitle,
            ),
          },
          organization: {
            ...classNames?.trigger?.organization,
            subtitle: cn('hidden', classNames?.trigger?.organization?.subtitle),
          },
        },
        content: {
          ...classNames?.content,
          base: cn(organization?.isPersonal ? '[&_a]:hidden' : '', classNames?.content?.base),
          organization: {
            ...classNames?.content?.organization,
            subtitle: cn('hidden', classNames?.content?.organization?.subtitle),
          },
        },
      }}
      hidePersonal
      {...props}
    />
  );
};
