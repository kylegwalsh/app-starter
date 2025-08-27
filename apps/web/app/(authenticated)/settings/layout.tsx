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
      // TODO: Upgrade better auth to fix this
      // @ts-expect-error - better auth is fixing the types here
      ...(isLoading || organization?.isPersonal
        ? []
        : [{ label: 'Organization', href: '/settings/organization' }]),
    ],
    [isLoading, organization]
  );

  /** The tab that is currently active based on the pathname */
  const activeTab = useMemo(() => {
    return settingsTabs.find((tab) => tab.href === pathname);
  }, [settingsTabs, pathname]);

  return (
    <>
      <Header breadcrumbs={[{ label: 'Settings', href: '/settings' }]} />

      {/* Settings Navigation Tabs */}
      <Tabs value={activeTab?.label} className="w-full">
        <TabsList className="flex w-full items-end justify-start border-0 border-b bg-transparent p-0 md:px-2 lg:px-4">
          {settingsTabs.map((tab) => (
            <Link key={tab.label} href={tab.href} className="flex-1 md:flex-none">
              <TabsTrigger
                value={tab.label}
                className="text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground w-full rounded-none border-0 !bg-transparent px-2 !shadow-none data-[state=active]:border-b-2 sm:px-4 md:px-6 lg:px-10">
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
