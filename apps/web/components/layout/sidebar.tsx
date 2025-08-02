'use client';

import { OrganizationSwitcher, UserButton } from '@daveyplate/better-auth-ui';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@repo/design';
import { ChevronRight, LayoutDashboard, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { ComponentType, SVGProps } from 'react';

/** The type for a navigation item */
type NavItem = {
  /** The text to show with this item */
  title: string;
  /** The URL to navigate to when this item is clicked */
  url: string;
  /** The icon to show with this item */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Whether this item should be auto-expanded to show it's sub-items */
  autoExpand?: boolean;
  /** Any sub-items to show underneath this item */
  items?: NavItem[];
};

/** The sidebar for the application */
export const AppSidebar: FC = ({ children }) => {
  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <OrganizationSwitcher
            classNames={{
              trigger: {
                base: 'w-full h-fit group-data-[collapsible=icon]:!bg-transparent group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:[&>svg]:hidden',
                user: {
                  content: 'group-data-[collapsible=icon]:hidden',
                  title: 'group-data-[collapsible=icon]:hidden',
                  subtitle: 'group-data-[collapsible=icon]:hidden',
                },
              },
            }}
          />
        </SidebarHeader>
        <SidebarContent className="overflow-x-hidden">
          <SidebarGroup>
            <AppSidebarGroup
              label="Overview"
              navItems={[
                {
                  title: 'Dashboard',
                  url: '/',
                  icon: LayoutDashboard,
                },
              ]}
            />
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <AppSidebarGroup
            navItems={[
              {
                title: 'Settings',
                url: '/settings',
                icon: Settings,
              },
            ]}
          />
          <Separator className="mb-2 group-data-[collapsible=icon]:mb-1" />
          <SidebarMenu>
            <SidebarMenuItem>
              <UserButton
                disableDefaultLinks
                additionalLinks={[
                  {
                    label: 'Settings',
                    icon: <Settings />,
                    href: '/settings',
                  },
                ]}
                classNames={{
                  trigger: {
                    base: 'w-full group-data-[collapsible=icon]:!bg-transparent group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:[&>svg]:hidden',
                    user: {
                      content: 'group-data-[collapsible=icon]:hidden',
                      title: 'group-data-[collapsible=icon]:hidden',
                      subtitle: 'group-data-[collapsible=icon]:hidden',
                    },
                  },
                }}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </>
  );
};

/** Renders a group of navigation items in the sidebar */
const AppSidebarGroup = ({ navItems, label }: { navItems: NavItem[]; label?: string }) => {
  const pathname = usePathname();

  return (
    <>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {navItems.map((item) => {
          const Icon = item.icon;
          return item?.items && item?.items?.length > 0 ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.autoExpand}
              className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} isActive={pathname === item.url}>
                    {Icon ? <Icon /> : null}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                          <Link href={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} isActive={pathname === item.url}>
                <Link href={item.url}>
                  {Icon ? <Icon /> : null}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </>
  );
};
