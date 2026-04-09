'use client';

import { UserButton as BaseUserButton } from '@daveyplate/better-auth-ui';
import { cn } from '@repo/design/lib/utils';
import { Settings } from 'lucide-react';
import type { ComponentProps } from 'react';

/** User button with shared default styling and links */
export const UserButton = ({ classNames, ...props }: ComponentProps<typeof BaseUserButton>) => {
  return (
    <BaseUserButton
      classNames={{
        ...classNames,
        trigger: {
          ...classNames?.trigger,
          base: cn(
            'w-full bg-background text-foreground shadow-md hover:bg-background/30 dark:hover:bg-background/60 group-data-[collapsible=icon]:!bg-transparent group-data-[collapsible=icon]:!shadow-none group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:[&>svg]:hidden',
            classNames?.trigger?.base,
          ),
          user: {
            ...classNames?.trigger?.user,
            content: cn('group-data-[collapsible=icon]:hidden', classNames?.trigger?.user?.content),
            title: cn('group-data-[collapsible=icon]:hidden', classNames?.trigger?.user?.title),
            subtitle: cn(
              'group-data-[collapsible=icon]:hidden',
              classNames?.trigger?.user?.subtitle,
            ),
          },
        },
      }}
      additionalLinks={[
        {
          label: 'Settings',
          icon: <Settings />,
          href: '/settings',
        },
      ]}
      disableDefaultLinks
      {...props}
    />
  );
};
