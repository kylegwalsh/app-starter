'use client';

import { Tabs, TabsList, TabsTrigger } from '@repo/design';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { Header } from '@/components';
import { useUser } from '@/hooks';

/** The layout for settings pages with top navigation */
const SettingsLayout: FC = ({ children }) => {
  const pathname = usePathname();
  const { isLoading, organization } = useUser();

  /** The settings navigation tabs */
  const settingsTabs = useMemo(
    () => [
      { label: 'General', href: '/settings' },
      { label: 'Account', href: '/settings/account' },
      { label: 'Plans', href: '/settings/plans' },
      { label: 'Billing', href: '/settings/billing' },
      // Only show the organization tab if the user is logged into a non-personal organization
      ...(isLoading || organization?.isPersonal
        ? []
        : [{ label: 'Organization', href: '/settings/organization' }]),
    ],
    [isLoading, organization],
  );

  /** The tab that is currently active based on the pathname */
  const activeTab = useMemo(
    () => settingsTabs.find((tab) => tab.href === pathname),
    [settingsTabs, pathname],
  );

  return (
    <>
      <Header breadcrumbs={[{ label: 'Settings', href: '/settings' }]} />

      {/* Settings Navigation Tabs */}
      <Tabs className="w-full" value={activeTab?.label}>
        <TabsList className="flex w-full items-end justify-start border-0 border-b bg-transparent p-0 md:px-2 lg:px-4">
          {settingsTabs.map((tab) => (
            <Link className="flex-1 md:flex-none" href={tab.href} key={tab.label}>
              <TabsTrigger
                className="!bg-transparent !shadow-none w-full rounded-none border-0 px-2 text-muted-foreground data-[state=active]:border-primary data-[state=active]:border-b-2 data-[state=active]:text-foreground sm:px-4 md:px-6 lg:px-10"
                value={tab.label}
              >
                {tab.label}
              </TabsTrigger>
            </Link>
          ))}
        </TabsList>
      </Tabs>

      {/* Settings Content */}
      <div className="flex flex-1 p-10 py-8">{children}</div>
    </>
  );
};

export default SettingsLayout;
